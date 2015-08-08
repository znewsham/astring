

// Polyfill for non-ES6 interpreters
if ( !String.prototype.repeat ) {
	String.prototype.repeat = function ( count ) {
		// Perfom some checks first
		if ( count < 0 ) {
			throw new RangeError( 'Repeat count must be non-negative' )
		} else if ( count === Infinity ) {
			throw new RangeError( 'Repeat count must be less than infinity' )
		}
		// Ensure it's an integer
		count = count | 0
		if ( this.length * count >= 1 << 28 ) {
			// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat
			// Most current (August 2014) browsers can't handle strings 1 << 28 chars or longer
			throw new RangeError( 'Repeat count must not overflow maximum string size' )
		}
		var out = []
		while ( count-- ) {
			out.push( this )
		}
		return out.join( '' )
	}
}


function formatParameters( code, params, state ) {
	/*
	Formats function parameters provided in `params` into the `code` array.
	*/
	code.push( '(' )
	if ( params != null && params.length !== 0 ) {
		for (let i = 0, { length } = params; i < length; i++) {
			let param = params[ i ]
			visitors[ param.type ]( param, state )
			code.push( ', ' )
		}
		// Remove trailing comma
		code.pop()
	}
	code.push( ') ' )
}


function formatBinarySideExpression( code, node, operator, state ) {
	/*
	Formats into the `code` array a left-hand or right-hand expression `node` from a binary expression applying the provided `operator`.
	*/
	const needed = PARENTHESIS_NEEDED[ node.type ]
	if ( needed === 0 ) {
		visitors[ node.type ]( node, state )
		return
	} else if ( needed === 1 ) {
		if ( OPERATORS_PRECEDENCE[ node.operator ] >= OPERATORS_PRECEDENCE[ operator ] ) {
			visitors[ node.type ]( node, state )
			return
		}
	}
	code.push( '(' )
	visitors[ node.type ]( node, state )
	code.push( ')' )
}


const OPERATORS_PRECEDENCE = {
	'||': 3,
	'&&': 4,
	'|': 5,
	'^': 6,
	'&': 7,
	'==': 8,
	'!=': 8,
	'===': 8,
	'!==': 8,
	'<': 9,
	'>': 9,
	'<=': 9,
	'>=': 9,
	'in': 9,
	'instanceof': 9,
	'<<': 10,
	'>>': 10,
	'>>>': 10,
	'+': 11,
	'-': 11,
	'*': 12,
	'%': 12,
	'/': 12
}


const PARENTHESIS_NEEDED = {
	// Not needed
	Identifier: 0,
	Literal: 0,
	MemberExpression: 0,
	CallExpression: 0,
	Super: 0,
	ThisExpression: 0,
	// Check
	BinaryExpression: 1,
	LogicalExpression: 1
}


var ForInStatement, FunctionDeclaration, RestElement, BinaryExpression, ArrayExpression


var visitors = {
	Program: function( node, state ) {
		const indent = state.indent.repeat( state.indentLevel )
		const { lineEnd, code } = state
		let statements = node.body
		for (var i = 0, { length } = statements; i < length; i++) {
			code.push( indent )
			let statement = statements[i]
			if ( state.comments ) {}
			this[ statement.type ]( statement, state )
			code.push( lineEnd )
		}
	},
	BlockStatement: function( node, state ) {
		const indent = state.indent.repeat( state.indentLevel++ )
		const { lineEnd, code } = state
		const statementIndent = indent + state.indent
		code.push( '{' )
		var statements = node.body
		if ( statements != null && statements.length !== 0 ) {
			code.push( lineEnd );
			for (var i = 0, { length } = statements; i < length; i++) {
				code.push( statementIndent )
				let statement = statements[ i ]
				if ( state.comments ) {
					const { comments } = state
				}
				this[ statement.type ]( statement, state )
				code.push( lineEnd )
			}
			code.push( indent )
		}
		code.push( '}' )
		state.indentLevel--
	},
	EmptyStatement: function( node, state ) {
		state.code.push( ';' )
	},
	ExpressionStatement: function( node, state ) {
		this[ node.expression.type ]( node.expression, state )
		state.code.push( ';' )
	},
	IfStatement: function( node, state ) {
		const { code } = state
		code.push( 'if (' )
		this[ node.test.type ]( node.test, state )
		code.push( ') ' )
		this[ node.consequent.type ]( node.consequent, state )
		if ( node.alternate != null ) {
			code.push( ' else ' )
			this[ node.alternate.type ]( node.alternate, state )
		}
	},
	LabeledStatement: function( node, state ) {
		this[ node.label.type ]( node.label, state )
		state.code.push( ':', state.lineEnd )
		this[ node.body.type ]( node.body, state )
	},
	BreakStatement: function( node, state ) {
		const { code } = state
		code.push( 'break' )
		if ( node.label ) {
			code.push( ' ' )
			this[ node.label.type ]( node.label, state )
		}
		code.push( ';' )
	},
	ContinueStatement: function( node, state ) {
		const { code } = state
		code.push( 'continue' )
		if ( node.label ) {
			code.push( ' ' )
			this[ node.label.type ]( node.label, state )
		}
		code.push( ';' )
	},
	WithStatement: function( node, state ) {
		const { code } = state
		code.push( 'with (' )
		this[ node.object.type ]( node.object, state )
		code.push( ') ' )
		this[ node.body.type ]( node.body, state )
	},
	SwitchStatement: function( node, state ) {
		const indent = state.indent.repeat( state.indentLevel++ )
		const { lineEnd, code } = state
		state.indentLevel++
		const caseIndent = indent + state.indent
		const statementIndent = caseIndent + state.indent
		code.push( 'switch (' )
		this[ node.discriminant.type ]( node.discriminant, state )
		code.push(') {', lineEnd)
		const {cases} = node;
		for (let i = 0, { length } = cases; i < length; i++) {
			let check = cases[i];
			if ( check.test ) {
				code.push( caseIndent, 'case ' )
				this[ check.test.type ]( check.test, state )
				code.push( ':', lineEnd )
			} else {
				code.push( caseIndent, 'default:', lineEnd )
			}
			let { consequent } = check
			for (let i = 0, { length } = consequent; i < length; i++) {
				let statement = consequent[ i ]
				code.push( statementIndent )
				this[ statement.type ]( statement, state )
				code.push( lineEnd )
			}
		}
		state.indentLevel -= 2
		code.push( indent, '}' )
	},
	ReturnStatement: function( node, state ) {
		const { code } = state
		code.push( 'return' )
		if ( node.argument ) {
			code.push( ' ' )
			this[ node.argument.type ]( node.argument, state )
		}
		code.push( ';' )
	},
	ThrowStatement: function( node, state ) {
		const { code } = state
		code.push( 'throw ' )
		this[ node.argument.type ]( node.argument, state )
		code.push( ';' )
	},
	TryStatement: function( node, state ) {
		const { code } = state
		code.push( 'try ' )
		this[ node.block.type ]( node.block, state )
		if ( node.handler ) {
			let { handler } = node
			code.push( ' catch (' )
			this[ handler.param.type ]( handler.param, state )
			code.push( ') ' )
			this[ handler.body.type ]( handler.body, state )
		}
		if ( node.finalizer ) {
			code.push( ' finally ' )
			this[ node.finalizer.type ]( node.finalizer, state )
		}
	},
	WhileStatement: function( node, state ) {
		const { code } = state
		code.push( 'while (' )
		this[ node.test.type ]( node.test, state )
		code.push( ') ' )
		this[ node.body.type ]( node.body, state )
	},
	DoWhileStatement: function( node, state ) {
		const { code } = state
		code.push( 'do ' )
		this[ node.body.type ]( node.body, state )
		code.push( ' while (' )
		this[ node.test.type ]( node.test, state )
		code.push( ');' )
	},
	ForStatement: function( node, state ) {
		const { code } = state
		code.push( 'for (' )
		if ( node.init ) {
			this.ForInit( node.init, state )
		}
		code.push( '; ' )
		if ( node.test ) {
			this[ node.test.type ]( node.test, state )
		}
		code.push( '; ' )
		if ( node.update ) {
			this[ node.update.type ]( node.update, state )
		}
		code.push( ') ' )
		this[ node.body.type ]( node.body, state )
	},
	ForInStatement: ForInStatement = function( node, state ) {
		const { code } = state
		code.push( 'for (' )
		this.ForInit( node.left, state )
		code.push( node.type[ 3 ] === 'I' ? ' in ' : ' of ' )
		this[ node.right.type ]( node.right, state )
		code.push( ') ' )
		this[ node.body.type ]( node.body, state )
	},
	ForOfStatement: ForInStatement,
	ForInit: function( node, state ) {
		this[ node.type ]( node, state )
		if ( node.type === 'VariableDeclaration' ) {
			// Remove inserted semicolon
			state.code.pop()
		}
	},
	DebuggerStatement: function( node, state ) {
		state.code.push( 'debugger;', state.lineEnd )
	},
	FunctionDeclaration: FunctionDeclaration = function( node, state ) {
		const { code } = state
		code.push( node.generator ? 'function* ' : 'function ' )
		if ( node.id )
			code.push( node.id.name )
		formatParameters( code, node.params, state )
		this[ node.body.type ]( node.body, state )
	},
	VariableDeclaration: function( node, state ) {
		const { code } = state
		const { declarations } = node
		code.push( node.kind, ' ' )
		for (let i = 0, { length } = declarations; i < length; i++) {
			let declaration = declarations[i]
			this[ declaration.id.type ]( declaration.id, state )
			if ( declaration.init ) {
				code.push( ' = ' )
				this[ declaration.init.type ]( declaration.init, state )
			}
			code.push( ', ' )
		}
		// Remove trailing comma
		code.pop()
		code.push( ';' )
	},
	ClassDeclaration: function( node, state ) {
		const { code } = state
		code.push( 'class ' )
		if ( node.id ) {
			code.push( node.id.name + ' ' )
		}
		if ( node.superClass ) {
			code.push( 'extends ' )
			this[ node.superClass.type ]( node.superClass, state )
			code.push( ' ' )
		}
		this.BlockStatement( node.body, state )
	},
	ImportDeclaration: function( node, state ) {
		const { code } = state
		code.push( 'import ' )
		const { specifiers } = node
		const { length } = specifiers
		if ( length > 0 ) {
			let i = 0, specifier
			importSpecifiers: while ( i < length ) {
				specifier = specifiers[ i ]
				switch (specifier.type) {
					case 'ImportDefaultSpecifier':
						code.push( specifier.local.name )
						i++
						break
					case 'ImportNamespaceSpecifier':
						code.push( '* as ', specifier.local.name )
						i++
						break
					default:
						break importSpecifiers
				}
				code.push( ', ' )
			}
			if ( i < length ) {
				code.push( '{' )
				while (i < length) {
					specifier = specifiers[i]
					let { name } = specifier.imported
					code.push( name )
					if ( name !== specifier.local.name ) {
						code.push( ' as ', specifier.local.name )
					}
					code.push( ', ' )
					i++
				}
				// Remove trailing comma
				code.pop()
				code.push( '}' )
			} else {
				// Remove trailing comma
				code.pop()
			}
			code.push( ' from ' )
		}
		code.push( node.source.raw )
		code.push( ';' )
	},
	ExportDefaultDeclaration: function( node, state ) {
		const { code } = state
		code.push( 'export default ' )
		this[ node.declaration.type ]( node.declaration, state )
		if ( node.declaration.type.substr( -10 ) === 'Expression' )
			code.push( ';' )
	},
	ExportNamedDeclaration: function( node, state ) {
		const { code } = state
		code.push( 'export ' )
		if ( node.declaration ) {
			this[ node.declaration.type ]( node.declaration, state )
		} else {
			code.push( '{' )
			const { specifiers } = node
			const { length } = specifiers
			if ( length > 0 ) {
				for (let i = 0; i < length; i++) {
					let specifier = specifiers[i]
					let {name} = specifier.local
					code.push( name )
					if ( name !== specifier.exported.name )
						code.push( ' as ' + specifier.exported.name )
					code.push( ', ' )
				}
				// Remove trailing comma
				code.pop()
			}
			code.push( '}' )
			if ( node.source ) {
				code.push( ' from ', node.source.raw )
			}
			code.push( ';' )
		}
	},
	ExportAllDeclaration: function( node, state ) {
		state.code.push( 'export * from ', node.source.raw, ';' )
	},
	MethodDefinition: function( node, state ) {
		const { code } = state
		if ( node.static )
			code.push( 'static ' )
		switch (node.kind) {
			case 'get':
			case 'set':
				code.push( node.kind, ' ' )
				break
			default:
				break
		}
		if ( node.computed ) {
			code.push( '[' )
			this[ node.key.type ]( node.key, state )
			code.push( ']' )
		} else {
			code.push( node.key.name )
		}
		formatParameters( code, node.value.params, state )
		this[ node.value.body.type ]( node.value.body, state )
	},
	ClassExpression: function( node, state ) {
		this.ClassDeclaration( node, state )
	},
	ArrowFunctionExpression: function( node, state ) {
		const { code } = state
		formatParameters( code, node.params, state )
		code.push( '=> ' )
		if ( node.body.type === 'ObjectExpression' ) {
			code.push( '(' )
			this.ObjectExpression( node.body, state )	
			code.push( ')' )
		} else
			this[ node.body.type ]( node.body, state )
	},
	ThisExpression: function( node, state ) {
		state.code.push( 'this' )
	},
	Super: function( node, state ) {
		state.code.push( 'super' )
	},
	RestElement: RestElement = function( node, state ) {
		state.code.push( '...' )
		this[ node.argument.type ]( node.argument, state )
	},
	SpreadElement: RestElement,
	YieldExpression: function( node, state ) {
		const { code } = state
		code.push( 'yield' )
		if ( node.argument ) {
			code.push( ' ' )
			this[ node.argument.type ]( node.argument, state )
		}
	},
	TemplateLiteral: function( node, state ) {
		const { code } = state
		const {quasis, expressions} = node
		code.push( '`' )
		for (let i = 0, { length } = expressions; i < length; i++) {
			let expression = expressions[ i ]
			code.push( quasis[i].value.raw )
			code.push( '${' )
			this[ expression.type ]( expression, state )
			code.push( '}' )
		}
		code.push( quasis[quasis.length-1].value.raw )
		code.push( '`' )
	},
	TaggedTemplateExpression: function( node, state ) {
		this[ node.tag.type ]( node.tag, state )
		this[ node.quasi.type ]( node.quasi, state )
	},
	ArrayExpression: ArrayExpression = function( node, state ) {
		const { code } = state
		code.push( '[' )
		if ( node.elements.length !== 0 ) {
			for (let i = 0, {elements} = node, { length } = elements; i < length; i++) {
				let element = elements[ i ]
				this[ element.type ]( element, state )
				code.push( ', ' )
			}
			code.pop()
		}
		code.push( ']' )
	},
	ArrayPattern: ArrayExpression,
	ObjectExpression: function( node, state ) {
		const indent = state.indent.repeat( state.indentLevel++ )
		const { lineEnd, code } = state
		const propertyIndent = indent + state.indent
		code.push( '{' )
		if ( node.properties.length !== 0 ) {
			const comma = ',' + lineEnd
			code.push( lineEnd )
			for ( let i = 0, { properties } = node, { length } = properties; i < length; i++ ) {
				let property = properties[ i ]
				code.push( propertyIndent )
				if ( property.computed ) code.push( '[' )
				this[ property.key.type ]( property.key, state )
				if ( property.computed ) code.push( ']' )
				if ( !property.shorthand ) {
					code.push( ': ' )
					this[ property.value.type ]( property.value, state )
					code.push( comma )
				}
			}
			code.pop()
			code.push( lineEnd )
		}
		state.indentLevel--
		code.push( indent, '}' )
	},
	ObjectPattern: function( node, state ) {
		const { code } = state
		code.push( '{' )
		if ( node.properties.length !== 0 ) {
			for ( let i = 0, { properties } = node, { length } = properties; i < length; i++ ) {
				let property = properties[ i ]
				if ( property.computed ) {
					code.push( '[' )
					this[ property.key.type ]( property.key, state )
					code.push( ']' )
				} else {
					this[ property.key.type ]( property.key, state )
				}
				if ( !property.shorthand ) {
					code.push( ': ' )
					this[ property.value.type ]( property.value, state )
				}
				code.push( ', ' )
			}
			// Removing trailing comma
			code.pop()
		}
		code.push( '}' )
	},
	FunctionExpression: FunctionDeclaration,
	SequenceExpression: function( node, state ) {
		const { code } = state
		const {expressions} = node
		if ( expressions.length !== 0 ) {
			for (let i = 0, { length } = expressions; i < length; i++) {
				let expression = expressions[ i ]
				this[ expression.type ]( expression, state )
				code.push( ', ' )
			}
			code.pop()
		}
	},
	UnaryExpression: function( node, state ) {
		if ( node.prefix ) {
			state.code.push( node.operator, ' ' )
			this[ node.argument.type ]( node.argument, state )
		} else {
			this[ node.argument.type ]( node.argument, state )
			state.code.push( node.operator )
		}
	},
	UpdateExpression: function( node, state ) {
		if ( node.prefix ) {
			state.code.push( node.operator )
			this[ node.argument.type ]( node.argument, state )
		} else {
			this[ node.argument.type ]( node.argument, state )
			state.code.push( node.operator )	
		}
	},
	AssignmentExpression: function( node, state ) {
		this[ node.left.type ]( node.left, state )
		state.code.push( ' ', node.operator, ' ' )
		this[ node.right.type ]( node.right, state )
	},
	AssignmentPattern: function( node, state ) {
		this[ node.left.type ]( node.left, state )
		state.code.push( ' = ' )
		this[ node.right.type ]( node.right, state )
	},
	BinaryExpression: BinaryExpression = function( node, state ) {
		const { code } = state
		const { operator } = node
		formatBinarySideExpression( code, node.left, operator, state )
		code.push( ' ', node.operator, ' ' )
		formatBinarySideExpression( code, node.right, operator, state )
	},
	LogicalExpression: BinaryExpression,
	ConditionalExpression: function( node, state ) {
		const { code } = state
		this[ node.test.type ]( node.test, state )
		code.push( ' ? ' )
		this[ node.consequent.type ]( node.consequent, state )
		code.push( ' : ' )
		this[ node.alternate.type ]( node.alternate, state )
	},
	NewExpression: function( node, state ) {
		state.code.push( 'new ' )
		this.CallExpression( node, state )
	},
	CallExpression: function( node, state ) {
		const { code } = state
		if ( PARENTHESIS_NEEDED[ node.callee.type ] === 0 ) {
			this[ node.callee.type ]( node.callee, state )
		} else {
			code.push( '(' )
			this[ node.callee.type ]( node.callee, state )
			code.push( ')' )
		}
		code.push( '(' )
		const args = node[ 'arguments' ]
		if ( args.length !== 0 ) {
			for (let i = 0, { length } = args; i < length; i++) {
				let arg = args[ i ]
				this[ arg.type ]( arg, state )
				code.push( ', ' )
			}
			code.pop()
		}
		code.push( ')' )
	},
	MemberExpression: function( node, state ) {
		const { code } = state
		this[ node.object.type ]( node.object, state )
		if ( node.computed ) {
			code.push( '[' )
			this[ node.property.type ]( node.property, state )
			code.push( ']' )
		} else {
			code.push( '.' )
			this[ node.property.type ]( node.property, state )
		}
	},
	Identifier: function( node, state ) {
		state.code.push( node.name )
	},
	Literal: function( node, state ) {
		state.code.push( node.raw )
	}
}



export default function( node, options ) {
	/*
	Returns a string representing the rendered code of the provided AST `node`.
	The `options` are:

	- `indent`: string to use for indentation (defaults to `\t`)
	- `lineEnd`: string to use for line endings (defaults to `\n`)
	- `startingIndentLevel`: indent level to start from (default to `0`)
	- `comments`: generate comments if `true` (defaults to `false`)
	*/
	const state = (options == null) ? {
		code: [],
		indent: "\t",
		lineEnd: "\n",
		indentLevel: 0,
		comments: false
	} : {
		// Will contain the resulting code as an array of code strings
		code: [],
		// Formating options
		indent: options.indent != null ? options.indent : "\t",
		lineEnd: options.lineEnd != null ? options.lineEnd : "\n",
		indentLevel: options.startingIndentLevel != null ? options.startingIndentLevel : 0,
		comments: options.comments ? options.comments : false
	}
	// Walk through the AST node and generate the code
	visitors[ node.type ]( node, state )
	return state.code.join( '' )
}

