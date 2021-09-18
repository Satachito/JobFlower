const
platform = window.platform()

const
Sub			= ( p, q ) => p.map( ( $, _ ) => $ - q[ _ ] )

const
Equal		= ( p, q ) => p.every( ( $, _ ) => $ === q[ _ ] )

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
elements	= []	//	[ id: S, type: S, rect:[ N, N, N, N ], supp: ANY ]	type: proc, EXEC, SPAWN, FILE, COMMENT

const
Validate	= () => {
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
	,	Validate()
	,	DrawElements()
	)
)

const
TD = new TextDecoder( 'utf-8' )

window.onStdout(
	( _, $ ) => Out( TD.decode( $ ) )
)

window.onStderr(
	( _, $ ) => Err( TD.decode( $ ) )
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
CommentPath	= ( [ x, y, X, Y ] ) => {
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
	,	COMMENT	: CommentPath( e[ 2 ] )
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
SpawnString = e => FileGeneric(
	e
,	( imps, args, stdI, stdO, stdE ) => {
		const _		= []
		_.push( ...e[ 3 ].split( ' ' ).filter( $ => $.length ) )
		_.push( ...args )
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

,Validate()

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
				e2d.beginPath()
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
			DrawBottomLeft = $ => (
				e2d.font='12px monospace'
			,	e2d.textAlign='left'
			,	e2d.fillText( $, x, Y - 4, X - x )
			)
			const
			DrawBottomRight = $ => (
				e2d.font='12px monospace'
			,	e2d.textAlign='right'
			,	e2d.fillText( $, X, Y - 4, X - x )
			)


			switch ( e[ 1 ] ) {	//	type
			case 'FILE':
				moving
				?	DrawBottomLeft( '---- dragging ----' )
				:	await window.invokeStat( e[ 3 ] ).then(
						$ => (
							DrawBottomLeft( '' + $.size )
						,	DrawBottomRight( new Date( $.mtimeMs ).toLocaleString() )
						)
					).catch( $ => DrawBottomLeft( '----' ) )
				break
			case 'COMMENT':
				break
			case 'EXEC':
				DrawBottomLeft( ExecString( e ).split( '\n' )[ 0 ] )
				break
			case 'SPAWN':
				DrawBottomLeft( SpawnString( e ) )
				break
			default:
				DrawBottomLeft( ProgString( e ) )
				break
			}

			switch ( e[ 1 ] ) {	//	type
			case 'FILE':
			case 'COMMENT':
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
c2d.fillStyle = '#0002'
c2d.strokeStyle = 'red'

const
ClearControls = () => c2d.clearRect( 0, 0, CONTROL_C.width, CONTROL_C.height )

const
Out = $ => (
	OUT_TA.textContent += $
,	OUT_TA.scrollTop = OUT_TA.scrollHeight
)
const
Err = $ => (
	ERR_TA.textContent += $
,	ERR_TA.scrollTop = ERR_TA.scrollHeight
)
const
Sys = ( ...$ ) => (
	SYS_TA.textContent += $.join( '\n' ) + '\n'
,	SYS_TA.scrollTop = SYS_TA.scrollHeight
)
CLEAR_OUT_TA	.onclick = () => OUT_TA.textContent = ''
CLEAR_ERR_TA	.onclick = () => ERR_TA.textContent = ''
CLEAR_SYS_TA	.onclick = () => SYS_TA.textContent = ''
COPY_OUT_TA		.onclick = () => window.clipboard().writeText( OUT_TA.textContent )
COPY_ERR_TA		.onclick = () => window.clipboard().writeText( ERR_TA.textContent )
COPY_SYS_TA		.onclick = () => window.clipboard().writeText( SYS_TA.textContent )
const
NowTime = () => {
	const date = new Date()
	return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
}
const
SysLog = ( ...$ ) => Sys( NowTime(), ...$ )
const
IDLog = ( id, ...$ ) => Sys( `${NowTime()} ${id}`, ...$ )

var
mode = 'SELECT'

const
Select = ( $, _ ) => (
	mode = $
,	MODE_SELECT		.style.borderColor = 'black'
,	MODE_FILE		.style.borderColor = 'black'
,	MODE_EXEC		.style.borderColor = 'black'
,	MODE_SPAWN		.style.borderColor = 'black'
,	MODE_PROGRAM	.style.borderColor = 'black'
,	MODE_STD		.style.borderColor = 'black'
,	MODE_ARG		.style.borderColor = 'black'
,	MODE_IMP		.style.borderColor = 'black'
,	MODE_COMMENT	.style.borderColor = 'black'
,	_.style.borderColor = 'red'
)
MODE_SELECT		.onclick = ev => Select( 'SELECT'	, MODE_SELECT	)
MODE_FILE		.onclick = ev => Select( 'FILE'		, MODE_FILE		)
MODE_EXEC		.onclick = ev => Select( 'EXEC'		, MODE_EXEC		)
MODE_SPAWN		.onclick = ev => Select( 'SPAWN'	, MODE_SPAWN	)
MODE_PROGRAM	.onclick = ev => Select( 'PROGRAM'	, MODE_PROGRAM	)
MODE_STD		.onclick = ev => Select( 'STD'		, MODE_STD		)
MODE_ARG		.onclick = ev => Select( 'ARG'		, MODE_ARG		)
MODE_IMP		.onclick = ev => Select( 'IMP'		, MODE_IMP		)
MODE_COMMENT	.onclick = ev => Select( 'COMMENT'	, MODE_COMMENT	)

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

const
NewID = () => {
	let _ = 0
	while ( Element( _ ) ) _++
	return _
}

const
ControlXY = ev => {
	const o = CONTROL_C.getBoundingClientRect()
	return [ ev.clientX - o.left, ev.clientY - o.top ]
}

const
HitHTMLElement = ( e, ev ) => {
	const o = e.getBoundingClientRect()
	return HitRect( [ o.left, o.top, o.left + o.width, o.top + o.height ], [ ev.clientX, ev.clientY ] )
}

document.onmousedown = md => {

	if ( md.button ) return

	if (
		HitHTMLElement( HEADER, md )
	||	HitHTMLElement( FOOTER, md )
	||	HitHTMLElement( NAV, md )
	||	HitHTMLElement( ASIDE, md )
	) return

	const
	mdXY = ControlXY( md )

	if ( md.detail > 1 ) {
		const e = elements.find( e => HitRect( e[ 2 ], mdXY ) )
		e && EditElement( e )
		return
	}

	const
	Generic = ( dragProc, doProc, cancelProc ) => (
		document.onmousemove = mm => (
			ClearControls()
		,	dragProc( mm )
		)
	,	document.onmouseup = mu => (
			document.onmousemove	= null
		,	document.onmouseup		= null
		,	ClearControls()
		,	Equal( ControlXY( mu ), mdXY )
			?	cancelProc && cancelProc()
			:	doProc( mu )
		)
	)

	const
	NR = ev => NormalRect( ...mdXY, ...ControlXY( ev ) )

	const
	PCGeneric = ( $, pathProc ) => Generic(
		mm => c2d.stroke( pathProc( NR( mm ) ) )
	,	mu => (
			PC_TYPE.textContent = $
		,	PC.value = ''
		,	DIALOG_PC_OK.onclick = () => {
				DIALOG_PC.close()
				const e = [ NewID(), $, NR( mu ), PC.value ]
				Job( () => elements.push( e ), () => elements = elements.filter( $ => $ !== e ) )
			}
		,	DIALOG_PC_CANCEL.onclick = () => DIALOG_PC.close()
		,	DIALOG_PC.onclose = ClearControls
		,	DIALOG_PC.showModal()
		)
	)
	const
	RelationGeneric = $ => {
		const s = elements.find( e => c2d.isPointInPath( ElementPath( e ), ...mdXY ) )
		s && s[ 1 ] !== 'COMMENT' && Generic(
			mm => (
				c2d.beginPath()
			,	c2d.moveTo( ...mdXY )
			,	c2d.lineTo( ...ControlXY( mm ) )
			,	c2d.setLineDash( Dash( $ ) )
			,	c2d.stroke()
			,	c2d.setLineDash( [] )
			)
		,	mu => {
				const d = elements.find( e => c2d.isPointInPath( ElementPath( e ), ...ControlXY( mu ) ) )
				if (
					d
				&&	d[ 1 ] !== 'COMMENT'
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
	case 'SELECT'	:
		{	selection.some( e => HitRect( e[ 2 ], mdXY ) ) || (
				selection = elements.filter( e => HitRect( e[ 2 ], mdXY ) )
			,	DrawElements()
			)
			if ( selection.length ) {
				const oldRects = selection.map( e => [ ...e[ 2 ] ] )
				Generic(
					mm => (
						selection.forEach(
							( e, _ ) => e[ 2 ] = MoveRect( oldRects[ _ ], Sub( ControlXY( mm ), mdXY ) )
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
				selection = elements.filter( e => c2d.isPointInPath( ElementPath( e ), ...mdXY ) )
				DrawElements()
				if ( selection.length ) {
					const oldRects = selection.map( e => [ ...e[ 2 ] ] )
					const centers = oldRects.map( $ => Center( $ ) )
					Generic(
						mm => (
							selection.forEach(
								( e, _ ) => {
									let [ x, y, X, Y ] = oldRects[ _ ]
									const mmXY = ControlXY( mm )
									mdXY[ 0 ] < centers[ _ ][ 0 ]
									?	x += mmXY[ 0 ] - mdXY[ 0 ]
									:	X += mmXY[ 0 ] - mdXY[ 0 ]
									mdXY[ 1 ] < centers[ _ ][ 1 ]
									?	y += mmXY[ 1 ] - mdXY[ 1 ]
									:	Y += mmXY[ 1 ] - mdXY[ 1 ]
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
						mm => c2d.strokeRect( ...mdXY, ...Sub( ControlXY( mm ), mdXY ) )
					,	mu => {
							const rect = NR( mu )
							selection = elements.filter( e => InRect( e[ 2 ], rect ) )
							DrawElements()
						}
					)
				}
			}
		}
		break
	case 'FILE'	:
		Generic(
			mm => c2d.stroke( FilePath( NR( mm ) ) )
		,	mu => ( DIALOG_TYPE_NEW.checked ? window.invokeSaveDialog : window.invokeOpenDialog )( PATH_TYPE_ABSOLUTE.checked ).then(
				$ => (
					$.forEach(
						$ => {
							const e = [ NewID(), 'FILE', NR( mu ), $ ]
							Job( () => elements.push( e ), () => elements = elements.filter( $ => $ !== e ) )
						}
					)
				,	DrawElements()
				)
			)
		)
		break
	case 'STD'		:
		RelationGeneric( 'STD' )
		break
	case 'ARG'		:
		RelationGeneric( 'ARG' )
		break
	case 'IMP'		:
		RelationGeneric( 'IMP' )
		break
	case 'COMMENT'	:
		PCGeneric( 'COMMENT', CommentPath )
		break
	case 'EXEC'		:
		PCGeneric( 'EXEC', ProcPath )
		break
	case 'SPAWN'	:
		PCGeneric( 'SPAWN', ProcPath )
		break
	case 'PROGRAM'		:
		Generic(
			mm => c2d.stroke( ProcPath( NR( mm ) ) )
		,	mu => (
				RemoveChildren( EXTENSION )
			,	Object.keys( ExtensionDict ).forEach( $ => EXTENSION.appendChild( OptionElement( $ ) ) )
			,	PROGRAM.value = ''
			,	DIALOG_PROGRAM_OK.onclick = () => {
					DIALOG_PROGRAM.close()
					const e = [ NewID(), EXTENSION.value, NR( mu ), PROGRAM.value ]
					Job( () => elements.push( e ), () => elements = elements.filter( $ => $ !== e ) )
				}
			,	DIALOG_PROGRAM_CANCEL.onclick = () => DIALOG_PROGRAM.close()
			,	DIALOG_PROGRAM.onclose = ClearControls
			,	DIALOG_PROGRAM.showModal()
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
			,	COMMENT	: window.sendCommentCM
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
Copy = $ => {
	const IDs = $.map( $ => $[ 0 ] )
	window.clipboard().writeText(
		JSON.stringify(
			{	JobFlower:
				{	elements	: $
				,	relations	: relations.filter( r => IDs.includes( r[ 1 ] ) || IDs.includes( r[ 2 ] ) )
				}
			}
		)
	)
}
const
Delete = $ => {
	const oldEs = [ ...elements ]
	const oldRs = [ ...relations ]
	const IDs = $.map( $ => $[ 0 ] )
	Job(
		() => (
			elements = elements.filter( e => !$.includes( e ) )
		,	relations = relations.filter( r => !IDs.includes( r[ 1 ] ) && !IDs.includes( r[ 2 ] ) )
		)
	,	() => ( elements = oldEs, relations = oldRs )
	)
}
const
Cut = $ => (
	Copy( $ )
,	Delete( $ )
)

const
Paste = () => {
	const toPaste = JSON.parse( window.clipboard().readText() ).JobFlower
	if ( toPaste ) {
		const oldEs = [ ...elements ]
		const oldRs = [ ...relations ]
		const oldSelection = selection
		Job(
			() => {
				const _ = {}
				selection = []
				toPaste.elements.forEach(
					e => {
						const newE = [ NewID(), e[ 1 ], MoveRect( e[ 2 ], [ 16, 16 ] ), e[ 3 ] ]
						_[ e[ 0 ] ] = newE[ 0 ]
						elements.push( newE )
						selection.push( newE )
					}
				)
				toPaste.relations.forEach(
					r => relations.push( [ r[ 0 ], _[ r[ 1 ] ] ?? r[ 1 ], _[ r[ 2 ] ] ?? r[ 2 ] ] )
				)
				Validate()
			}
		,	() => (
				elements = oldEs
			,	relations = oldRs
			,	selection = oldSelection
			)
		)
	}
}
const
DeleteRelation = $ => {
	const oldRs = [ ...relations ]
	Job(
		() => relations = relations.filter( r => $[ 0 ] !== r[ 0 ] || $[ 1 ] !== r[ 1 ] || $[ 2 ] !== r[ 2 ] )
	,	() => relations = oldRs
	)
}


const
Bypass = ev => document.activeElement === CONTROL_C && ( platform === 'darwin' ? ev.metaKey : ev.ctrlKey )

CONTROL_C.onkeydown = ev => (
	(	{	s: () => Select( 'SELECT'	, MODE_SELECT	)
		,	f: () => Select( 'FILE'		, MODE_FILE		)
		,	e: () => Select( 'EXEC'		, MODE_EXEC		)
		,	p: () => Select( 'SPAWN'	, MODE_SPAWN	)
		,	r: () => Select( 'PROGRAM'	, MODE_PROGRAM	)
		,	d: () => Select( 'STD'		, MODE_STD		)
		,	g: () => Select( 'ARG'		, MODE_ARG		)
		,	h: () => Select( 'IMP'		, MODE_IMP		)
		,	m: () => Select( 'COMMENT'	, MODE_COMMENT	)
		,	Backspace: () => Delete( selection )
		,	x: () => Bypass( ev ) && Cut( selection )
		,	c: () => Bypass( ev ) && Copy( selection )
		,	v: () => Bypass( ev ) && Paste()
		,	z: () => Bypass( ev ) && ( ev.shiftKey ? Redo() : Undo() )
		,	a: () => Bypass( ev ) && ( selection = elements.slice() )
		}
	)[ ev.key ] ?? ( () => {} )
)()

//	RUN & MAKE

const
Run = ( id, cb = () => {} ) => {

	const
	CleanUp = () => (
		ClearControls()
	,	DrawElements()
	,	cb()
	)

	const e = Element( id )
	ClearControls()
	c2d.fill( ElementPath( e ) )
	switch ( e[ 1 ] ) {
	case 'EXEC':
		IDLog( id, ExecString( e ) )
		window.invokeExec( ExecString( e ) ).then(
			$ => (
				Out( $.stdout )
			,	Err( $.stderr )
			,	CleanUp()
			)
		)
		break
	case 'SPAWN':
		IDLog( id, SpawnString( e ) )
		{	const e3 = e[ 3 ].split( ' ' )
			e3.length
			?	FileGeneric(
					e
				,	( imps, args, stdI, stdO, stdE ) => (
						window.invokeSpawn(
							e3[ 0 ]
						,	e3.splice( 1 ).concat( args )
						,	stdI
						,	stdO
						,	stdE
						).then( $ => CleanUp() )
					)
				)
			:	CleanUp()
		}
		break
	default:
		IDLog( id, ProgString( e ) )
		FileGeneric(
			e
		,	( imps, args, stdI, stdO, stdE ) => {
				const _ = `.${e[ 0 ]}.${e[ 1 ]}`
				window.invokeWrite( _, e[ 3 ] ).then(
					$ => window.invokeSpawn(
						ExtensionDict[ e[ 1 ] ]
					,	[ _ ]
					,	stdI
					,	stdO
					,	stdE
					).then(
						$ => window.invokeUnlink( _ ).then(
							$ => CleanUp()
						)
					)
				)
			}
		)
		break
	}
}
const
ChainRun = $ => $.length && Run( $[ 0 ], () => ChainRun( $.splice( 1 ) ) )

const
Uppers = $ => relations.filter( r => r[ 2 ] === $ ).map( $ => $[ 1 ] )

const
ProcChain = proc => [
	...Uppers( proc ).flatMap( file => Uppers( file ) ).flatMap( proc => ProcChain( proc ) )
,	proc
]

const
ProcString = $ => {
	const e = Element( $ )
	switch ( e[ 1 ] ) {
	case 'EXEC'	: return ExecString( e )
	case 'SPAWN': return SpawnString( e )
	default:
		return `cat > .${e[ 0 ]}.${e[ 1 ]} << EOD
${e[ 3 ]}
EOD
${ProgString( e )}
`
	}
}

const
ProcScript = file => Uppers( file ).flatMap( proc => ProcChain( proc ) ).reduce(
	( $, _ ) => $ + ProcString( _ )
,	''
)

window.onMenu(
	( _, menu, $ ) => {
		console.log( 'onMenu', menu, $ )
		;(	{	elementCopy		: () => Copy			( [ Element( $ ) ] )
			,	elementDelete	: () => Delete			( [ Element( $ ) ] )
			,	elementCut		: () => Cut				( [ Element( $ ) ] )
			,	elementEdit		: () => EditElement		( Element( $ ) )
			,	relationDelete	: () => DeleteRelation	( $ )
			,	procRun			: () => Run				( $ )
			,	procRunAll		: () => ChainRun		( ProcChain( $ ) )
			,	fileUnlink		: () => window.invokeUnlink( elements.find( e => e[ 0 ] === $ )[ 3 ] ).then( DrawElements ).catch( $ => SysLog( $ ) )
			,	fileMake		: () => ChainRun( Uppers( $ ).flatMap( proc => ProcChain( proc ) ) )
			,	fileScript		: () => Sys( ProcScript( $ ) )
			,	undo			: Undo
			,	redo			: Redo
			,	cut				: () => Cut				( selection )
			,	copy			: () => Copy			( selection )
			,	paste			: Paste
			,	delete			: () => Delete			( selection )
			,	selectAll		: () => ( selection = elements.slice(), DrawElements() )
			}[ menu ] ?? ( () => {} )
		)()
	}
)

//window.invokeMessageBox( { message: 'Hello', buttons: [ 'OK', 'Cancel' ] } ).then( console.log )

