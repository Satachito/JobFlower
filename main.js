const
{ app, BrowserWindow, Menu, MenuItem, ipcMain, dialog, clipboard } = require( 'electron' )

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

console.log(
	'argv'
,	argv.slice(
		isWin
		?	argv[ 0 ].split( '\\' ).pop()	== 'electron.exe'	? 2 : 1
		:	argv[ 0 ].split( '/' ).pop()	== 'Electron'		? 2 : 1
	)
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

		mBar.insert(
			isMac ? 3 : 2
		,	new MenuItem(
				{	label: 'Element'
				,	submenu: [
						{	label	: 'Undo'		,	click: () => SendMenu( 'undo'		) ,   accelerator : 'Alt+Z'			}
					,	{	label	: 'Redo'		,	click: () => SendMenu( 'redo'		) ,   accelerator : 'Shift+Alt+Z'	}
					,	{	type	: 'separator' }
					,	{	label	: 'Cut'			,	click: () => SendMenu( 'cut'		) ,   accelerator : 'Alt+X'			}
					,	{	label	: 'Copy'		,	click: () => SendMenu( 'copy'		) ,   accelerator : 'Alt+C'			}
					,	{	label	: 'Paste'		,	click: () => SendMenu( 'paste'		) ,   accelerator : 'Alt+V'			}
					,	{	label	: 'Delete'		,	click: () => SendMenu( 'delete'		) ,   accelerator : 'Delete'		}
					,	{	label	: 'Select All'	,	click: () => SendMenu( 'selectAll'	) ,   accelerator : 'Alt+A'			}
					]
				}
			)
		)
//	アクセラレータ
//	Command キーは使わない。代わりにCommandOrControl
//	Option は使わない、これは macOS だけ、代わりに Alt を使う。Alt は macOS では Option にマップされている
//	文字の Cut, Copy, Paste などを行う機能は macOS では CMD, Windows では Ctrl が使われている
//	特にWindows ではハードコードされているのでもし Ctrl+.. の動きを変えたい場合は onkey... に手を入れなくてはならない
//	Super == Meta は使わない。Windows では特殊な意味を持っている。

		Menu.setApplicationMenu( mBar )

		OpenDialog()
	}
)

ipcMain.on(
	'clipboard'
,	( ev, $ ) => clipboard.writeText( $ )
)

ipcMain.handle(
	'clipboard'
,	ev => clipboard.readText()
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
		,	JSON.stringify( $ )
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
	'commCM'
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
,	( ev, $ ) => {	//	Element
		const cm = new Menu()
		cm.append( new MenuItem( { label: 'Undo'			, click: () => SendMenu( 'undo'				, $ ) } ) )
		cm.append( new MenuItem( { label: 'Redo'			, click: () => SendMenu( 'redo'				, $ ) } ) )
		cm.append( new MenuItem( { type	: 'separator' } ) )
		cm.append( new MenuItem( { label: 'Paste'			, click: () => SendMenu( 'paste'			, $ ) } ) )
		cm.append( new MenuItem( { label: 'Select All'		, click: () => SendMenu( 'selectAll'		, $ ) } ) )
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
console.log( '>exec:', command )
				exec(
					command
				,	( error, stdout, stderr ) => (
						error 
						?	( console.log( '*exec:', command ), j( error ) )
						:	( console.log( '>exec:', command ), s( { stdout, stderr } ) )
					)
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
console.log( '>spawn:', command )
				const $ = spawn( command, args )
				stdin && createReadStream( stdin ).pipe( $.stdin )
				stdout
				?	$.stdout.pipe( createWriteStream( stdout ) )
				:	$.stdout.on( 'data', $ => Send( 'stdout', $ ) )
				stderr
				?	$.stderr.pipe( createWriteStream( stderr ) )
				:	$.stderr.on( 'data', $ => Send( 'stderr', $ ) )
				$.on( 'close', ( code, signal ) => ( console.log( '<spawn:', command ), s( code, signal ) ) )
				$.on( 'error', $ => ( console.log( '*spawn:', command ), j( $ ) ) )
			}
		)
	)
)

