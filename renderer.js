console.log( 'Platform:', window.platform() )

const
Sub			= ( [ x, y ], [ X, Y ] ) => [ x - X, y - Y ]

const
Center		= ( [ x, y, X, Y ] ) => [ ( x + X ) / 2, ( y + Y ) / 2 ]

const
MoveRect	= ( [ x, y, X, Y ], [ moveX, moveY ] ) => [ x + moveX, y + moveY, X + moveX, Y + moveY ]

//	RECT MUST BE NORMALIZED

const
NormalRect	= ( x, y, X, Y ) => [
	x < X ? x : X
,	y < Y ? y : Y
,	x > X ? x : X
,	y > Y ? y : Y
]

const
OrRect		= ( [ x0, y0, X0, Y0 ], [ x1, y1, X1, Y1 ] ) => [
	x0 < x1 ? x0 : x1
,	y0 < y1 ? y0 : y1
,	X0 > X1 ? X0 : X1
,	Y0 > Y1 ? Y0 : Y1
]

const
EqualRect	= ( [ x0, y0, X0, Y0 ], [ x1, y1, X1, Y1 ] ) => x0 === x1 && y0 === y1 && X0 === X1 && Y0 === Y1

const
HitRect		= ( [ x, y, X, Y ], [ offX, offY ] ) => x < offX && offX < X && y < offY && offY < Y

const
InRect		= ( r0, r1 ) => EqualRect( OrRect( r0, r1 ), r1 )

const
ExtensionDict = {
	sh		: 'sh'
,	bash	: 'bash'
,	js		: 'node'
,	mjs		: 'node'
,	cjs		: 'node'
,	py		: 'python'
,	py3		: 'python3'
}

const
RemoveChildren	= $ => {
	while ( $.firstChild ) $.removeChild( $.firstChild )
}

var
relations	= []	//	[ type: S, id: S, id: S ] 	type: ARG, STD, IMP

var
elements	= []	//	[ id: S, type: S, rect:[ N, N, N, N ], supp: ANY ]	type: proc, EXEC, SPAW, FILE, COMM

const
Adjust	= () => {
	const IDs = elements.map( $ => $[ 0 ] )
	const error = relations.filter( r => !( IDs.includes( r[ 1 ] ) && IDs.includes( r [ 2 ] ) ) )
	error.length && console.error( 'DANGLING RELATIONS:', error )
	error.length && setTimeout( () => alert( 'DANGLING RELATIONS:' + error ), 0 )
	relations = relations.filter( r => IDs.includes( r[ 1 ] ) && IDs.includes( r [ 2 ] ) )
}

window.onData(
	( _, $ ) => (
		elements	= $.elements ?? []
	,	relations	= $.relations ?? []
	,	Adjust()
	,	DrawElements()
	)
)

const
TD = new TextDecoder( 'utf-8' )

window.onStdout(
	( _, $ ) => OUT_TA.textContent += TD.decode( $ )
)

window.onStderr(
	( _, $ ) => ERR_TA.textContent += TD.decode( $ )
)

var
selection	= []

const
undoes		= []
const
Undo		= () => {
	if ( !undoes.length ) return
	const _ = undoes.pop()
	_.Undo()
	redoes.push( _ )
	Save()
	DrawElements()
}

const
redoes		= []
const
Redo		= () => {
	if ( !redoes.length ) return
	const _ = redoes.pop()
	_.Do()
	undoes.push( _ )
	Save()
	DrawElements()
}

const
Job			= ( Do, Undo ) => (
	redoes.length = 0
,	redoes.push( { Do, Undo } )
,	Redo()
)

const
Element		= id => elements.find( e => e[ 0 ] === id )

const
Detail		= ( id, index ) => elements.filter( e => e[ 0 ] === id ).map( e => e[ index ] )

const
Type		= id => Detail( id, 1 )[ 0 ]

const
Rect		= id => Detail( id, 2 )[ 0 ]

const
Supp		= id => Detail( id, 3 )[ 0 ]

const
From		= id => Detail( id, 1 )[ 0 ]

const
To			= id => Detail( id, 2 )[ 0 ]

const
FilePath	= ( [ x, y, X, Y ] ) => {
	const _ = new Path2D()
	_.moveTo( x, y )
	_.lineTo( X, y )
	_.bezierCurveTo( X + F4, y, X + F4, Y, X, Y )
	_.lineTo( x, Y )
	_.bezierCurveTo( x - F4, Y, x - F4, y, x, y )
	_.closePath()
	return _
}

const
CommPath	= ( [ x, y, X, Y ] ) => {
	const _ = new Path2D()
	_.moveTo( X, y )
	_.quadraticCurveTo( X + F2, y, X + F2, y + F2 )
	_.lineTo( X + F2, Y - F2 )
	_.quadraticCurveTo( X + F2, Y, X, Y )
	_.lineTo( x, Y )
	_.quadraticCurveTo( x - F2, Y, x - F2, Y - F2 )
	_.lineTo( x - F2, y + F2 )
	_.quadraticCurveTo( x - F2, y, x, y )
	_.closePath()
	return _
}

const
ProcPath	= ( [ x, y, X, Y ] ) => {
	const _ = new Path2D()
	_.rect( x - F2, y, X - x + F4, Y - y )
	_.closePath()
	return _
}

const
ElementPath	= e => (
	{	FILE	: FilePath( e[ 2 ] )
	,	COMM	: CommPath( e[ 2 ] )
	}[ e[ 1 ] ] ?? ProcPath( e[ 2 ] )
)

const
RelationCircle	= r => {
	const _ = new Path2D()
	_.arc( ...Center( [ ...Center( Rect( r[ 1 ] ) ), ...Center( Rect( r[ 2 ] ) ) ] ), 16, 0, Math.PI * 2, false )
	return _
}

const
Dash		= $ => (
	{	ARG	: [ 3 ]
	,	STD	: []
	}[ $ ] ?? [ 10, 5 ]
)

//	DRAW

const
F1 = 8

const
F2 = F1 * 2

const
F3 = F1 * 3

const
F4 = F1 * 4

const
e2d = ELEMENT_C.getContext( '2d' )

const
FileGeneric = ( e, $ ) => {
	const id	= e[ 0 ]
	const imps	= relations.filter( r => r[ 0 ] === 'IMP' && ( r[ 1 ] === id || r[ 2 ] === id ) )
	const args	= relations.filter( r => r[ 0 ] === 'ARG' && ( r[ 1 ] === id || r[ 2 ] === id ) )

	const stdI	= relations.filter( r => r[ 0 ] === 'STD' && r[ 2 ] === id )[ 0 ]
	const stdO	= relations.filter( r => r[ 0 ] === 'STD' && r[ 1 ] === id )[ 0 ]
	const stdE	= relations.filter( r => r[ 0 ] === 'STD' && r[ 1 ] === id )[ 1 ]

	return $(
		imps
	,	args.map( r => Supp( r[ r[ 1 ] === id ? 2 : 1 ] ) )
	,	stdI ? Supp( stdI[ 1 ] ) : null
	,	stdO ? Supp( stdO[ 2 ] ) : null
	,	stdE ? Supp( stdE[ 2 ] ) : null
	)
}

const
ExecString = e => FileGeneric(
	e
,	( imps, args, stdI, stdO, stdE ) => {
		const _		= stdI ? [ 'cat', stdI, '|' ] : []
		_.push( ...e[ 3 ].split( ' ' ).filter( $ => $.length ) )
		_.push( ...args )
		let index = _.indexOf( '<<' )
		index === -1 && ( index = _.length )
		stdE && _.splice( index, 0, '2>', stdE )
		stdO && _.splice( index, 0, '>', stdO )
		return _.join( ' ' )
	}
)

const
SpawString = e => FileGeneric(
	e
,	( imps, args, stdI, stdO, stdE ) => {
		const _		= []
		_.push( e[ 3 ] )
		_.push( JSON.stringify( args ) )
		stdI && _.push( '<', stdI )
		stdO && _.push( '>', stdO )
		stdE && _.push( '2>', stdE )
		return _.join( ' ' )
	}
)

const
ProgString = e => FileGeneric(
	e
,	( imps, args, stdI, stdO, stdE ) => {
		const _		= [ ExtensionDict[ e[ 1 ] ] ]
		_.push( `.${e[ 0 ]}.${e[ 1 ]}` )
		_.push( ...args )
		stdI && _.push( '<', stdI )
		stdO && _.push( '>', stdO )
		stdE && _.push( '2>', stdE )
		return _.join( ' ' )
	}
)

const
DrawElements = moving => (

	e2d.clearRect( 0, 0, ELEMENT_C.width, ELEMENT_C.height )

,Adjust()

,	relations.forEach(
		r => {
			const m = Center( Rect( r[ 1 ] ) )
			const l = Center( Rect( r[ 2 ] ) )

			e2d.beginPath()
			e2d.moveTo( ...m )
			e2d.lineTo( ...l )
			e2d.setLineDash( Dash( r[ 0 ] ) )
			e2d.stroke()
			e2d.setLineDash( [] )

			e2d.beginPath()
			const slope1 = Math.atan2( ...Sub( l, m ).reverse() )
			const slope2 = slope1 + Math.PI / 2
			const [ x, y ] = Center( [ ...m, ...l ] )
			const X = Math.cos( slope2 ) * 4
			const Y = Math.sin( slope2 ) * 4
			e2d.moveTo( x - X, y - Y )
			e2d.lineTo( x + X, y + Y )
			e2d.lineTo( x + Math.cos( slope1 ) * 16, y + Math.sin( slope1 ) * 16 )
			e2d.closePath()
			e2d.fill()

			e2d.beginPath()
			e2d.arc( x, y, 16, 0, Math.PI * 2, false )
			e2d.stroke()
		}
	)
,	elements.forEach(
		async e => {
			const path = ElementPath( e )
			e2d.fillStyle = 'white'
			e2d.fill( path )
			e2d.fillStyle = 'black'
			e2d.strokeStyle = selection.includes( e ) ? 'red' : 'black'
			e2d.stroke( path )
			e2d.strokeStyle = 'black'

			const [ x, y, X, Y ] = e[ 2 ]

//	ID
			e2d.font = '12px monospace'
			e2d.textAlign = 'start'
			e2d.fillText( e[ 0 ], x, y + 12, X - x )

//	TYPE
			e2d.textAlign = 'end'
			e2d.fillText( e[ 1 ], X, y + 12, X - x )

//	Supp
			const textLines = e[ 3 ].split( '\n' )
			if ( textLines.length > 1 ) {
				const t = y + 16
				const b = Y - 16
				e2d.moveTo( x, t )
				e2d.lineTo( X, t )
				e2d.moveTo( x, b )
				e2d.lineTo( X, b )
				e2d.stroke()
				e2d.textAlign = 'start'
				for ( let _ = 0; _ < textLines.length; _++ ) {
					const offsetY = 18 * ( _ + 1 ) + t
					if ( offsetY > b ) break
					e2d.fillText( textLines[ _ ], x, offsetY, X - x )
				}
			} else {
				e2d.font='18px monospace'
				e2d.textAlign = 'center'
				e2d.fillText( e[ 3 ], ( x + X ) / 2, ( y + Y ) / 2 + 7, X - x )
			}

//	Bottom
			const
			DrawBottom = $ => (
				e2d.font='12px monospace'
			,	e2d.textAlign='start'
			,	e2d.fillText( $, x, Y - 4, X - x )
			)

			switch ( e[ 1 ] ) {	//	type
			case 'FILE':
				moving
				?	DrawBottom( '---- dragging ----' )
				:	await window.invokeStat( e[ 3 ] ).then(
						$ => DrawBottom( '' + $.size + ':' + new Date( $.mtimeMs ).toLocaleString() )
					).catch( $ => DrawBottom( '----' ) )
				break
			case 'COMM':
				break
			case 'EXEC':
				DrawBottom( ExecString( e ).split( '\n' )[ 0 ] )
				break
			case 'SPAW':
				DrawBottom( SpawString( e ) )
				break
			default:
				DrawBottom( ProgString( e ) )
				break
			}

			switch ( e[ 1 ] ) {	//	type
			case 'FILE':
			case 'COMM':
				break
			default:
				{	const
					DrawRelationType = ( r, text ) => {
						const w1 = Center( Rect( r[ 1 ] ) )
						const w2 = Center( Rect( r[ 2 ] ) )
						const slope1 = Math.atan2( ...Sub( w2, w1 ).reverse() )
						e2d.font='18px monospace'
						e2d.fillText(
							text
						,	( w1[ 0 ] + w2[ 0 ] ) / 2 - Math.cos( slope1 ) * 8
						,	( w1[ 1 ] + w2[ 1 ] ) / 2 - Math.sin( slope1 ) * 8
						)
					}

					const id	= e[ 0 ]
					const args	= relations.filter( r => r[ 0 ] === 'ARG' && ( r[ 1 ] === id || r[ 2 ] === id ) )
					args.forEach( ( r, _ ) => DrawRelationType( r, _ + 1 ) )

					const stdO	= relations.filter( r => r[ 0 ] === 'STD' && r[ 1 ] === id )[ 0 ]
					const stdE	= relations.filter( r => r[ 0 ] === 'STD' && r[ 1 ] === id )[ 1 ]
					stdO && DrawRelationType( stdO, 'out' )
					stdE && DrawRelationType( stdE, 'err' )
				}
			}
		}
	)
)

const
c2d = CONTROL_C.getContext( '2d' )
c2d.strokeStyle = 'red'

const
ClearControls = () => c2d.clearRect( 0, 0, CONTROL_C.width, CONTROL_C.height )

CLEAR_OUT_TA	.onclick = () => OUT_TA.textContent = ''
CLEAR_ERR_TA	.onclick = () => ERR_TA.textContent = ''
CLEAR_LOG_TA	.onclick = () => LOG_TA.textContent = ''
const
Log = $ => LOG_TA.textContent += $ + '\n'

var
mode = 'select'

const
Select = ( $, _ ) => (
	mode = $
,	MODE_SELECT		.style.borderColor = 'black'
,	MODE_FILE		.style.borderColor = 'black'
,	MODE_EXEC		.style.borderColor = 'black'
,	MODE_SPAW		.style.borderColor = 'black'
,	MODE_PROG		.style.borderColor = 'black'
,	MODE_STD		.style.borderColor = 'black'
,	MODE_ARG		.style.borderColor = 'black'
,	MODE_IMP		.style.borderColor = 'black'
,	MODE_COMM		.style.borderColor = 'black'
,	_.style.borderColor = 'red'
)
MODE_SELECT		.onclick = ev => Select( 'select'	, MODE_SELECT	)
MODE_FILE		.onclick = ev => Select( 'file'		, MODE_FILE		)
MODE_EXEC		.onclick = ev => Select( 'exec'		, MODE_EXEC		)
MODE_SPAW		.onclick = ev => Select( 'spaw'		, MODE_SPAW		)
MODE_PROG		.onclick = ev => Select( 'prog'		, MODE_PROG		)
MODE_STD		.onclick = ev => Select( 'std'		, MODE_STD		)
MODE_ARG		.onclick = ev => Select( 'arg'		, MODE_ARG		)
MODE_IMP		.onclick = ev => Select( 'imp'		, MODE_IMP		)
MODE_COMM		.onclick = ev => Select( 'comm'		, MODE_COMM		)

MODE_SELECT.dispatchEvent( new MouseEvent( 'click' ) )

CANVAS_SIZE		.onclick = ev => (
	CANVAS_SIZE_W.value = ELEMENT_C.width
,	CANVAS_SIZE_H.value = ELEMENT_C.height
,	DIALOG_CANVAS_SIZE_OK.onclick = () => (
		DIALOG_CANVAS_SIZE.close()
	,	CONTROL_C.width		=	ELEMENT_C.width		= CANVAS_SIZE_W.value
	,	CONTROL_C.height	=	ELEMENT_C.height	= CANVAS_SIZE_H.value
	,	DrawElements()
	)
,	DIALOG_CANVAS_SIZE_CANCEL.onclick = () => DIALOG_CANVAS_SIZE.close()
,	DIALOG_CANVAS_SIZE.showModal()
)

const
Save = () => window.invokeSave( { elements, relations } )

const
EditElement = e => (
	GENERIC1.value = e[ 1 ]
,	GENERIC3.value = e[ 3 ]
,	DIALOG_GENERIC_OK.onclick = () => {
		DIALOG_GENERIC.close()
		const old1 = e[ 1 ]
		const old3 = e[ 3 ]
		const new1 = GENERIC1.value
		const new3 = GENERIC3.value
		Job(
			() => ( e[ 1 ] = new1, e[ 3 ] = new3 )
		,	() => ( e[ 1 ] = old1, e[ 3 ] = old3 )
		)
	}
,	DIALOG_GENERIC_CANCEL.onclick = () => DIALOG_GENERIC.close()
,	DIALOG_GENERIC.onclose = ClearControls
,	DIALOG_GENERIC.showModal()
)

CONTROL_C.onmousedown = md => {

	if ( md.button ) return

	if ( md.detail > 1 ) {
		const e = elements.find( e => HitRect( e[ 2 ], [ md.offsetX, md.offsetY ] ) )
		e && EditElement( e )
		return
	}

	const
	Generic = ( dragProc, doProc, cancelProc ) => (
		CONTROL_C.onmousemove = mm => (
			ClearControls()
		,	dragProc( mm )
		)
	,	CONTROL_C.onmouseleave = () => (
			CONTROL_C.onmousemove	= null
		,	CONTROL_C.onmouseup		= null
		,	CONTROL_C.onmouseleave	= null
		,	ClearControls()
		)
	,	CONTROL_C.onmouseup = mu => (
			CONTROL_C.onmouseleave()
		,	mu.offsetX - md.offsetX && mu.offsetY - md.offsetY
			?	doProc( mu )
			:	cancelProc && cancelProc()
		)
	)
	const
	ProcGeneric = ( $, pathProc ) => Generic(
		mm => c2d.stroke( pathProc( NormalRect( md.offsetX, md.offsetY, mm.offsetX, mm.offsetY ) ) )
	,	mu => (
			PROC_TYPE.textContent = $
		,	PROC.value = ''
		,	DIALOG_PROC_OK.onclick = () => {
				DIALOG_PROC.close()
				const e = [ new Date().getTime(), $, NormalRect( md.offsetX, md.offsetY, mu.offsetX, mu.offsetY ), PROC.value ]
				Job( () => elements.push( e ), () => elements = elements.filter( $ => $ !== e ) )
			}
		,	DIALOG_PROC_CANCEL.onclick = () => DIALOG_PROC.close()
		,	DIALOG_PROC.onclose = ClearControls
		,	DIALOG_PROC.showModal()
		)
	)
	const
	RelationGeneric = $ => {
		const s = elements.find( e => c2d.isPointInPath( ElementPath( e ), md.offsetX, md.offsetY ) )
		s && s[ 1 ] !== 'COMM' && Generic(
			mm => (
				c2d.beginPath()
			,	c2d.moveTo( md.offsetX, md.offsetY )
			,	c2d.lineTo( mm.offsetX, mm.offsetY )
			,	c2d.setLineDash( Dash( $ ) )
			,	c2d.stroke()
			,	c2d.setLineDash( [] )
			)
		,	mu => {
				const d = elements.find( e => c2d.isPointInPath( ElementPath( e ), mu.offsetX, mu.offsetY ) )
				if (
					d
				&&	d[ 1 ] !== 'COMM'
				&&	s !== d
				&&	(	s[ 1 ] === 'FILE' && d[ 1 ] !== 'FILE' 
					||	s[ 1 ] !== 'FILE' && d[ 1 ] === 'FILE'
					)
				) {
					const r = [ $, s[ 0 ], d[ 0 ] ]
					Job( () => relations.push( r ), () => relations = relations.filter( $ => $ !== r ) )
				}
			}
		)
	}

	switch ( mode ) {
	case 'select'	:
		{	selection.some( e => HitRect( e[ 2 ], [ md.offsetX, md.offsetY ] ) ) || (
				selection = elements.filter( e => HitRect( e[ 2 ], [ md.offsetX, md.offsetY ] ) )
			,	DrawElements()
			)
			if ( selection.length ) {
				const oldRects = selection.map( e => [ ...e[ 2 ] ] )
				Generic(
					mm => (
						selection.forEach(
							( e, _ ) => e[ 2 ] = MoveRect( oldRects[ _ ], [ mm.offsetX - md.offsetX, mm.offsetY - md.offsetY ] )
						)
					,	DrawElements( true )
					)
				,	mu => {
						const newRects = selection.map( e => e[ 2 ] )
						const savedSelection = [ ...selection ]
						Job(
							() => newRects.forEach( ( $, _ ) => savedSelection[ _ ][ 2 ] = $ )
						,	() => oldRects.forEach( ( $, _ ) => savedSelection[ _ ][ 2 ] = $ )
						)
					}
				,	() => DrawElements()
				)
			} else {
				selection = elements.filter( e => c2d.isPointInPath( ElementPath( e ), md.offsetX, md.offsetY ) )
				DrawElements()
				if ( selection.length ) {
					const oldRects = selection.map( e => [ ...e[ 2 ] ] )
					const centers = oldRects.map( $ => Center( $ ) )
					Generic(
						mm => (
							selection.forEach(
								( e, _ ) => {
									let [ x, y, X, Y ] = oldRects[ _ ]
									md.offsetX < centers[ _ ][ 0 ]
									?	x += mm.offsetX - md.offsetX
									:	X += mm.offsetX - md.offsetX
									md.offsetY < centers[ _ ][ 1 ]
									?	y += mm.offsetY - md.offsetY
									:	Y += mm.offsetY - md.offsetY
									e[ 2 ] = NormalRect( x, y, X, Y )
								}
							)
						,	DrawElements( true )
						)
					,	mu => {
							const newRects = selection.map( e => e[ 2 ] )
							const savedSelection = [ ...selection ]
							Job(
								() => newRects.forEach( ( $, _ ) => savedSelection[ _ ][ 2 ] = $ )
							,	() => oldRects.forEach( ( $, _ ) => savedSelection[ _ ][ 2 ] = $ )
							)
						}
					,	() => DrawElements()
					)
				} else {
					Generic(
						mm => c2d.strokeRect( md.offsetX, md.offsetY, mm.offsetX - md.offsetX, mm.offsetY - md.offsetY )
					,	mu => {
							const rect = NormalRect( md.offsetX, md.offsetY, mu.offsetX, mu.offsetY )
							selection = elements.filter( e => InRect( e[ 2 ], rect ) )
							DrawElements()
						}
					)
				}
			}
		}
		break
	case 'file'	:
		Generic(
			mm => c2d.stroke( FilePath( NormalRect( md.offsetX, md.offsetY, mm.offsetX, mm.offsetY ) ) )
		,	mu => ( DIALOG_TYPE_NEW.checked ? window.invokeSaveDialog : window.invokeOpenDialog )( PATH_TYPE_ABSOLUTE.checked ).then(
				$ => (
					$.forEach(
						$ => {
							const e = [ new Date().getTime(), 'FILE', NormalRect( md.offsetX, md.offsetY, mu.offsetX, mu.offsetY ), $ ]
							Job( () => elements.push( e ), () => elements = elements.filter( $ => $ !== e ) )
						}
					)
				,	DrawElements()
				)
			)
		)
		break
	case 'std'		:
		RelationGeneric( 'STD' )
		break
	case 'arg'		:
		RelationGeneric( 'ARG' )
		break
	case 'imp'		:
		RelationGeneric( 'IMP' )
		break
	case 'comm'		:
		ProcGeneric( 'COMM', CommPath )
		break
	case 'exec'		:
		ProcGeneric( 'EXEC', ProcPath )
		break
	case 'spaw'		:
		ProcGeneric( 'SPAW', ProcPath )
		break
	default			:
		Generic(
			mm => c2d.stroke( ProcPath( NormalRect( md.offsetX, md.offsetY, mm.offsetX, mm.offsetY ) ) )
		,	mu => (
				RemoveChildren( EXTENSION )
			,	Object.keys( ExtensionDict ).forEach( $ => EXTENSION.appendChild( OptionElement( $ ) ) )
			,	PROG.value = ''
			,	DIALOG_PROG_OK.onclick = () => {
					DIALOG_PROG.close()
					const e = [ new Date().getTime(), EXTENSION.value, NormalRect( md.offsetX, md.offsetY, mu.offsetX, mu.offsetY ), PROG.value ]
					Job( () => elements.push( e ), () => elements = elements.filter( $ => $ !== e ) )
				}
			,	DIALOG_PROG_CANCEL.onclick = () => DIALOG_PROG.close()
			,	DIALOG_PROG.onclose = ClearControls
			,	DIALOG_PROG.showModal()
			)
		)
		break
	}
}

const
OptionElement = value => {
	const _ = document.createElement( 'option' )
	_.value = value
	_.textContent = '.' + value
	return _
}

CONTROL_C.oncontextmenu = ev => {
	const e = elements.find( e => c2d.isPointInPath( ElementPath( e ), ev.offsetX, ev.offsetY ) )
	if ( e ) {
		(	{	FILE	: window.sendFileCM
			,	COMM	: window.sendCommCM
			}[ e[ 1 ] ] ?? window.sendProcCM
		)( e[ 0 ] )
		return
	}
	const r = relations.find( r => c2d.isPointInPath( RelationCircle( r ), ev.offsetX, ev.offsetY ) )
	if ( r ) {
		r && window.sendRelationCM( r )
		return
	}
	window.sendCM()
}

const
CopyElements = $ => window.sendClipboard(
	JSON.stringify(
		{	JobFlower:
			{	elements	: elements.filter( e => $.includes( e[ 0 ] ) )
			,	relations	: relations.filter( r => $.includes( r[ 1 ] ) || $.includes( r[ 2 ] ) )
			}
		}
	)
)

const
DeleteElements = $ => {
	const oldEs = [ ...elements ]
	const oldRs = [ ...relations ]
	Job(
		() => (
			elements = elements.filter( e => !$.includes( e[ 0 ] ) )
		,	relations = relations.filter( r => !$.includes( r[ 1 ] ) && !$.includes( r[ 2 ] ) )
		)
	,	() => ( elements = oldEs, relations = oldRs )
	)
}

const
CutElements = $ => (
	CopyElements( $ )
,	DeleteElements( $ )
)

const
Paste = () => window.invokeClipboard().then(
	$ => {
		const cb = JSON.parse( $ ).JobFlower
		if ( cb ) {
			const oldEs = [ ...elements ]
			const oldRs = [ ...relations ]
			Job(
				() => (
					elements.push( ...cb.elements )
				,	relations.push( ...cb.relations )
				,	Adjust()
				)
			,	() => ( elements = oldEs, relations = oldRs )
			)
		}
	}
)
const
DeleteRelation = $ => {
	const oldRs = [ ...relations ]
	Job(
		() => relations = relations.filter( r => $[ 0 ] !== r[ 0 ] || $[ 1 ] !== r[ 1 ] || $[ 2 ] !== r[ 2 ] )
	,	() => relations = oldRs
	)
}

//	RUN & MAKE

const
Run = async id => {
	const e = elements.find( e => e[ 0 ] === id )
	switch ( e[ 1 ] ) {
	case 'EXEC':
		Log( ExecString( e ) )
		await window.invokeExec( ExecString( e ) ).then(
			$ => (
				OUT_TA.textContent += $.stdout
			,	ERR_TA.textContent += $.stderr
			)
		).catch( Log )
		break
	case 'SPAW':
		LOG_TA.textContent += SpawString( e ) + '\n'
		{	const e3 = e[ 3 ].split( ' ' )
			e3.length && FileGeneric(
				e
			,	async ( imps, args, stdI, stdO, stdE ) => (
					await window.invokeSpawn(
						e3[ 0 ]
					,	e3.splice( 1 ).concat( args )
					,	stdI
					,	stdO
					,	stdE
					).catch( Log )
				,	DrawElements()
				)
			)
		}
		break
	default:
		Log( ProgString( e ) )
		FileGeneric(
			e
		,	async ( imps, args, stdI, stdO, stdE ) => {
				const _ = `.${e[ 0 ]}.${e[ 1 ]}`
				await window.invokeWrite( _, e[ 3 ] )
				await window.invokeSpawn(
					ExtensionDict[ e[ 1 ] ]
				,	[ _ ]
				,	stdI
				,	stdO
				,	stdE
				).catch( Log )
				await window.invokeUnlink( _ )
				DrawElements()
			}
		)
	}
	DrawElements()
}
const
Uppers = $ => relations.filter( r => r[ 2 ] === $ ).map( $ => $[ 1 ] )

const
ChainRun = proc => {
	const upperFiles = Uppers( proc )
	const upperProcs = upperFiles.map( file => Uppers( file ) ).flat()
	upperProcs.forEach( proc => ChainRun( proc ) )
	Run( proc )
}


/*
局面
EXEC
	通常の使用
	Supp をそのままコマンドラインに渡す
	シェルを介しているのでパイプとかも扱える
SPAWN
	長い時間がかかるのでモニタしたい
	でもつながっているSTDはつなぐ
	Supp をそのままコマンドラインに渡す
prog
	Supp をファイルにして対応するインタープリタに食わせる
	Spawn で呼び出す。
*/

window.onMenu(
	( _, menu, $ ) => {
		console.log( 'onMenu', menu, $ )
		;
		(	{	undo			: Undo
			,	redo			: Redo
			,	paste			: Paste
			,	copy			: () => CopyElements	( selection.map( e => e[ 0 ] ) )
			,	delete			: () => DeleteElements	( selection.map( e => e[ 0 ] ) )
			,	cut				: () => CutElements		( selection.map( e => e[ 0 ] ) )
			,	elementCopy		: () => CopyElements	( [ $ ] )
			,	elementDelete	: () => DeleteElements	( [ $ ] )
			,	elementCut		: () => CutElements		( [ $ ] )
			,	elementEdit		: () => EditElement		( elements.find( e => e[ 0 ] === $ ) )
			,	relationDelete	: () => DeleteRelation	( $ )
			,	procRun			: () => Run( $ )
			,	selectAll		: () => ( selection = elements.slice(), DrawElements() )
			,	fileUnlink		: () => window.invokeUnlink( elements.find( e => e[ 0 ] === $ )[ 3 ] ).catch( $ => Log( $ ), DrawElements() )
			,	fileMake		: () => Uppers( $ ).forEach( proc => ChainRun( proc ) )
			}[ menu ] ?? ( () => {} )
		)()
	}
)

//window.invokeMessageBox( { message: 'Hello', buttons: [ 'OK', 'Cancel' ] } ).then( console.log )

