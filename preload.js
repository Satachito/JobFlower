const { contextBridge, ipcRenderer } = require( 'electron' )

contextBridge.exposeInMainWorld(
	'platform'
,	() => process.platform
)

//	MESSAGE BOX

contextBridge.exposeInMainWorld(
	'invokeMessageBox'
,	( ...$ ) => ipcRenderer.invoke( 'messageBox', ...$ )
)

//	ERROR BOX

contextBridge.exposeInMainWorld(
	'sendErrorBox'
,	( ...$ ) => ipcRenderer.send( 'errorBox', ...$ )
)

//	MENU

contextBridge.exposeInMainWorld(
	'onMenu'
,	( ...$ ) => ipcRenderer.on( 'menu', ...$ )
)

//	CLIPBOARD

contextBridge.exposeInMainWorld(
	'sendClipboard'
,	( ...$ ) => ipcRenderer.send( 'clipboard', ...$ )
)

contextBridge.exposeInMainWorld(
	'invokeClipboard'
,	( ...$ ) => ipcRenderer.invoke( 'clipboard', ...$ )
)

//	APPLICATION GENERIC

contextBridge.exposeInMainWorld(
	'onData'
,	( ...$ ) => ipcRenderer.on( 'data', ...$ )
)

contextBridge.exposeInMainWorld(
	'invokeSave'
,	( ...$ ) => ipcRenderer.invoke( 'save', ...$ )
)

//	FILE DIALOG

contextBridge.exposeInMainWorld(
	'invokeSaveDialog'
,	( ...$ ) => ipcRenderer.invoke( 'saveDialog', ...$ )
)

contextBridge.exposeInMainWorld(
	'invokeOpenDialog'
,	( ...$ ) => ipcRenderer.invoke( 'openDialog', ...$ )
)

//	JobFlower

contextBridge.exposeInMainWorld(
	'invokeStat'
,	( ...$ ) => ipcRenderer.invoke( 'stat', ...$ )
)

contextBridge.exposeInMainWorld(
	'invokeWrite'
,	( ...$ ) => ipcRenderer.invoke( 'write', ...$ )
)

contextBridge.exposeInMainWorld(
	'invokeUnlink'
,	( ...$ ) => ipcRenderer.invoke( 'unlink', ...$ )
)

contextBridge.exposeInMainWorld(
	'sendFileCM'
,	( ...$ ) => ipcRenderer.send( 'fileCM', ...$ )
)

contextBridge.exposeInMainWorld(
	'sendProcCM'
,	( ...$ ) => ipcRenderer.send( 'procCM', ...$ )
)

contextBridge.exposeInMainWorld(
	'sendCommCM'
,	( ...$ ) => ipcRenderer.send( 'commCM', ...$ )
)

contextBridge.exposeInMainWorld(
	'sendRelationCM'
,	( ...$ ) => ipcRenderer.send( 'relationCM', ...$ )
)

contextBridge.exposeInMainWorld(
	'sendCM'
,	( ...$ ) => ipcRenderer.send( 'CM', ...$ )
)

contextBridge.exposeInMainWorld(
	'invokeExec'
,	( ...$ ) => ipcRenderer.invoke( 'exec', ...$ )
)

contextBridge.exposeInMainWorld(
	'invokeSpawn'
,	( ...$ ) => ipcRenderer.invoke( 'spawn', ...$ )
)

contextBridge.exposeInMainWorld(
	'onStdout'
,	( ...$ ) => ipcRenderer.on( 'stdout', ...$ )
)

contextBridge.exposeInMainWorld(
	'onStderr'
,	( ...$ ) => ipcRenderer.on( 'stderr', ...$ )
)

