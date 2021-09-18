const
{ app, BrowserWindow, Menu, MenuItem, ipcMain, dialog } = require( 'electron' )

const
{ readFile, writeFile, createReadStream, createWriteStream, stat, unlink } = require( 'fs' )

const
{ join, dirname, relative } = require( 'path' )

const
{ promisify } = require( 'util' )

const
{ spawn, exec } = require( 'child_process' )

const
{ argv, platform, chdir } = process

const
isMac = platform === 'darwin'
const
isWin = platform === 'win32'

const
Send = ( ...$ ) => {
	const _ = BrowserWindow.getFocusedWindow()
	_ && _.send( ...$ )
}

const
SendMenu = ( ...$ ) => Send( 'menu', ...$ )

const
CreateWindow = file => {

	const 
	$ = new BrowserWindow(
		{	width			: 1400
		,	height			: 1000
		,	title			: file
		,	webPreferences	: {
				preload		: join( __dirname, 'preload.js' )
			,	file
			}
		}
	)

	$.webContents.on(
		'did-finish-load'
	,	async () => $.send( 'data', JSON.parse( await ( promisify( readFile )( file, 'utf8' ) ) ) )
	)
	$.loadFile( 'index.html' )

	$.webContents.openDevTools()
}


const
OpenDialog = () => ( dialog.showOpenDialogSync() ?? [] ).forEach( $ => CreateWindow( $ ) )

const
SaveDialog = async () => {
	const _ = dialog.showSaveDialogSync()
	_ && (
		await ( promisify( writeFile )( _, '[[],[]]' ) )
	,	CreateWindow( _ )
	)
}

//app.commandLine.appendSwitch( 'js-flags', '--max-old-space-size=4096' )
app.whenReady().then(
	() => {

		app.on(
			'activate'
		,	( event, hasVisibleWindows ) => hasVisibleWindows || SaveDialog()
		)

		app.on(
			'window-all-closed'
		,	() => isMac || app.quit()
		)

		const
		mBar = Menu.getApplicationMenu()

		const
		fileMenu = mBar.items.find( $ => $.role === 'filemenu' ).submenu
		fileMenu.insert(
			0
		,	new MenuItem( 
				{	label		: 'New'
				,	accelerator	: 'CmdOrCtrl+N'
				,	click		: ev => SaveDialog()
				}
			)
		)
		fileMenu.insert(
			1
		,	new MenuItem( 
				{	label		: 'Open...'
				,	accelerator	: 'CmdOrCtrl+O'
				,	click		: ev => OpenDialog()
				}
			)
		)
		fileMenu.insert( 2, new MenuItem( { type: 'separator' } ) )
		fileMenu.insert(
			3
		,	new MenuItem( 
				{	label		: 'Info'
				,	accelerator	: 'CmdOrCtrl+I'
				,	click		: () => SendMenu( 'info' )
				}
			)
		)
		fileMenu.insert( 4, new MenuItem( { type: 'separator' } ) )

		Menu.setApplicationMenu( mBar )

		OpenDialog()
	}
)

ipcMain.on(
	'errorBox'
,	( ev, ...$ ) => dialog.showErrorBox( ...$ )
)

ipcMain.handle(
	'messageBox'
,	( ev, ...$ ) => dialog.showMessageBoxSync( BrowserWindow.getFocusedWindow(), ...$ )
)

ipcMain.handle(
	'save'
,	async ( ev, $ ) => await (
		promisify( writeFile )( 
			ev.sender.browserWindowOptions.webPreferences.file
		,	JSON.stringify( $, null, '\t' )
		)
	)
)

////////	JobFlower

ipcMain.handle(
	'saveDialog'
,	( ev, absolute ) => {
		const dir = dirname( ev.sender.browserWindowOptions.webPreferences.file )
		const _ = dialog.showSaveDialogSync(
			BrowserWindow.getFocusedWindow()
		,	{ defaultPath: dir }
		)
		return _ ? [ absolute ? _ : relative( dir, _ )  ] : []
	}
)

ipcMain.handle(
	'openDialog'
,	( ev, absolute ) => {
		const dir = dirname( ev.sender.browserWindowOptions.webPreferences.file )
		const _ = dialog.showOpenDialogSync(
			BrowserWindow.getFocusedWindow()
		,	{ defaultPath: dir }
		)
		return _ ? ( absolute ? _ : _.map( $ => relative( dir, $ ) ) ) : []
	}
)

ipcMain.on(
	'fileCM'
,	( ev, $ ) => {	//	Element
		const cm = new Menu()
		cm.append( new MenuItem( { label: 'Cut'				, click: () => SendMenu( 'elementCut'		, $ ) } ) )
		cm.append( new MenuItem( { label: 'Copy'			, click: () => SendMenu( 'elementCopy'		, $ ) } ) )
		cm.append( new MenuItem( { label: 'Delete'			, click: () => SendMenu( 'elementDelete'	, $ ) } ) )
		cm.append( new MenuItem( { type	: 'separator' } ) )
		cm.append( new MenuItem( { label: 'Edit'			, click: () => SendMenu( 'elementEdit'		, $ ) } ) )
		cm.append( new MenuItem( { type	: 'separator' } ) )
		cm.append( new MenuItem( { label: 'Unlink'			, click: () => SendMenu( 'fileUnlink'		, $ ) } ) )
		cm.append( new MenuItem( { label: 'Make'			, click: () => SendMenu( 'fileMake'			, $ ) } ) )
		cm.append( new MenuItem( { label: 'Shell script'	, click: () => SendMenu( 'fileScript'		, $ ) } ) )
		cm.popup()
	}
)

ipcMain.on(
	'procCM'
,	( ev, $ ) => {	//	Element
		const cm = new Menu()
		cm.append( new MenuItem( { label: 'Cut'				, click: () => SendMenu( 'elementCut'		, $ ) } ) )
		cm.append( new MenuItem( { label: 'Copy'			, click: () => SendMenu( 'elementCopy'		, $ ) } ) )
		cm.append( new MenuItem( { label: 'Delete'			, click: () => SendMenu( 'elementDelete'	, $ ) } ) )
		cm.append( new MenuItem( { type	: 'separator' } ) )
		cm.append( new MenuItem( { label: 'Edit'			, click: () => SendMenu( 'elementEdit'		, $ ) } ) )
		cm.append( new MenuItem( { type	: 'separator' } ) )
		cm.append( new MenuItem( { label: 'Run'				, click: () => SendMenu( 'procRun'			, $ ) } ) )
		cm.append( new MenuItem( { label: 'Run all'			, click: () => SendMenu( 'procRunAll'		, $ ) } ) )
		cm.popup()
	}
)

ipcMain.on(
	'commentCM'
,	( ev, $ ) => {	//	Element
		const cm = new Menu()
		cm.append( new MenuItem( { label: 'Cut'				, click: () => SendMenu( 'elementCut'		, $ ) } ) )
		cm.append( new MenuItem( { label: 'Copy'			, click: () => SendMenu( 'elementCopy'		, $ ) } ) )
		cm.append( new MenuItem( { label: 'Delete'			, click: () => SendMenu( 'elementDelete'	, $ ) } ) )
		cm.append( new MenuItem( { type	: 'separator' } ) )
		cm.append( new MenuItem( { label: 'Edit'			, click: () => SendMenu( 'elementEdit'		, $ ) } ) )
		cm.popup()
	}
)

ipcMain.on(
	'relationCM'
,	( ev, $ ) => {	//	Element
		const cm = new Menu()
		cm.append( new MenuItem( { label: 'Delete'			, click: () => SendMenu( 'relationDelete'	, $ ) } ) )
		cm.popup()
	}
)

ipcMain.on(
	'CM'
,	ev => {
		const cm = new Menu()
		cm.append( new MenuItem( { label: 'Undo'			, click: () => SendMenu( 'undo'			) } ) )
		cm.append( new MenuItem( { label: 'Redo'			, click: () => SendMenu( 'redo'			) } ) )
		cm.append( new MenuItem( { type	: 'separator' } ) )
		cm.append( new MenuItem( { label: 'Cut'				, click: () => SendMenu( 'cut'			) } ) )
		cm.append( new MenuItem( { label: 'Copy'			, click: () => SendMenu( 'copy'			) } ) )
		cm.append( new MenuItem( { label: 'Paste'			, click: () => SendMenu( 'paste'		) } ) )
		cm.append( new MenuItem( { label: 'Delete'			, click: () => SendMenu( 'delete'		) } ) )
		cm.append( new MenuItem( { label: 'Select All'		, click: () => SendMenu( 'selectAll'	) } ) )
		cm.popup()
	}
)

ipcMain.handle(
	'stat'
,	async ( ev, $ ) => (
		chdir( dirname( ev.sender.browserWindowOptions.webPreferences.file ) )
	,	await ( promisify( stat )( $ ) )
	)
)

ipcMain.handle(
	'write'
,	async ( ev, file, $ ) => (
		chdir( dirname( ev.sender.browserWindowOptions.webPreferences.file ) )
	,	await ( promisify( writeFile )( file, $ ) )
	)
)

ipcMain.handle(
	'unlink'
,	async ( ev, $ ) => (
		chdir( dirname( ev.sender.browserWindowOptions.webPreferences.file ) )
	,	await ( promisify( unlink )( $ ) )
	)
)

ipcMain.handle(
	'exec'
,	async ( ev, command ) => (
		chdir( dirname( ev.sender.browserWindowOptions.webPreferences.file ) )
	,	await new Promise(
			( s, j ) => {
				exec(
					command
				,	( error, stdout, stderr ) => error 
					?	j( error )
					:	s( { stdout, stderr } )
				)
			}
		)
	)
)

ipcMain.handle(
	'spawn'
,	async ( ev, command, args, stdin, stdout, stderr ) => (
		chdir( dirname( ev.sender.browserWindowOptions.webPreferences.file ) )
	,	await new Promise(
			( s, j ) => {
				const $ = spawn( command, args )
				stdin && createReadStream( stdin ).pipe( $.stdin )
				stdout
				?	$.stdout.pipe( createWriteStream( stdout ) )
				:	$.stdout.on( 'data', $ => Send( 'stdout', $ ) )
				stderr
				?	$.stderr.pipe( createWriteStream( stderr ) )
				:	$.stderr.on( 'data', $ => Send( 'stderr', $ ) )
				$.on( 'close', ( code, signal ) => s( code, signal ) )
				$.on( 'error', $ => j( $ ) )
			}
		)
	)
)

