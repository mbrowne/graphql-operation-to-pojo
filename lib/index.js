"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = graphqlOperationToPOJO;

require("./polyfills");

var _graphql = require("graphql");

var _lodash = _interopRequireDefault(require("lodash.keyby"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// declare class Object extends Object {
//     fromEntries: (any[] | Iterable<any>) => Object;
// }
function test(info) {
  const pojo = graphqlOperationToPOJO(info);
  console.log(pojo.foo);
}
/**
 * Converts the AST of a GraphQL operation (query/subscription/mutation) to an
 * easier-to-consume format. Returns a Plain Old Javascript Object (POJO),
 * ready to be serialized to a JSON string.
 */


function graphqlOperationToPOJO(info) {
  // console.log('info: ', JSON.stringify(info))
  const operationAst = info.operation;
  const converter = new ASTtoPOJOConverter(info);
  return {
    operation: operationAst.operation,
    fields: converter.convert()
  };
}

class ASTtoPOJOConverter {
  constructor(info) {
    this.info = info;
  } // @TODO
  // Add an option to include the field path (fieldPath variable below) and update tests.
  // Currently it's only used for error messages.


  convert(ast = this.info.operation, tree = [], parentPath = '', // the type definition from the schema that corresponds to `ast.selectionSet`
  parentSchemaDef = this.getOperationTypeDef(), enclosingFragmentType) {
    const fieldMap = {};

    for (const selectionAst of this.getSelections(ast)) {
      if (this.isFragment(selectionAst)) {
        const fragmentAst = this.getAST(selectionAst);
        const fragmentType = fragmentAst.typeCondition && fragmentAst.typeCondition.name.value;
        const fragmentFields = this.convert(fragmentAst, tree, parentPath, parentSchemaDef, fragmentType); // Add fragment fields to the fieldMap.
        // This is needed in case of fragment field overrides...graphql allows you to repeat fields that are
        // part of the fragment above and/or below the fragment. This matters because in the case of nested
        // selections, the later selections should be merged with the earlier ones.

        for (const fragmentField of fragmentFields) {
          const key = this.generateFieldKey(fragmentField, parentSchemaDef);
          const existingField = fieldMap[key];

          if (!existingField) {
            fieldMap[key] = fragmentField;
          } else if (existingField.fields) {
            existingField.fields = this.mergeFieldSelections(existingField.fields, fragmentField.fields);
          }
        }
      } else {
        const fieldAst = selectionAst;
        const name = fieldAst.name ? fieldAst.name.value : undefined;
        const alias = fieldAst.alias ? fieldAst.alias.value : undefined;
        const field = {
          name: fieldAst.name.value
        };

        if (alias) {
          field.alias = alias;
        } // Set the fragmentType if this field is part of a fragment


        if (enclosingFragmentType) {
          field.fragmentType = enclosingFragmentType;
        }

        const fieldPath = (parentPath ? parentPath + '.' : '') + (alias || name || '');

        if (fieldAst.selectionSet) {
          // get the type definition from the schema for the return type of this field
          const returnType = this.getFieldReturnType(field, parentSchemaDef);
          const typeDef = returnType && this.info.schema.getType(returnType.toString());

          if (!typeDef) {
            throw Error(`graphqlOperationToPOJO(): Error matching query to schema: could not find type definition for field '${fieldPath}'`);
          }

          field.fields = this.convert(fieldAst, [], fieldPath, typeDef);
        }

        const args = this.argumentsFromAst(fieldAst.arguments);

        if (Object.keys(args).length) {
          field.arguments = args;
        }

        const directives = this.directivesFromAst(fieldAst.directives);

        if (Object.keys(directives).length) {
          field.directives = directives;
        } // Check for fragment field override. Field could also already exist if multiple fragments have the same field.
        // The later ones in the query take precedence over the earlier ones.


        const key = this.generateFieldKey(field, parentSchemaDef);
        const existingField = fieldMap[key];

        if (!existingField) {
          fieldMap[key] = field;
        } else if (existingField.fields) {
          existingField.fields = this.mergeFieldSelections(existingField.fields, field.fields);
        }
      }
    }

    return [...tree, ...Object.values(fieldMap)];
  } // Get the top-level type definition (either Query, Mutation, or Subscription)


  getOperationTypeDef() {
    const operationLowerCase = this.info.operation.operation;
    const operationUCFirst = operationLowerCase[0].toUpperCase() + operationLowerCase.substr(1);
    return this.info.schema[`get${operationUCFirst}Type`]();
  } // generate a key for this field to be used in fieldMap
  // (note: not globally unique, just unique at the current nesting level)


  generateFieldKey(field, parentSchemaDef) {
    const alias = field.alias || field.name; // Fields are keyed by type in addition to alias/name.
    // This is used to determine whether or not to merge field selections.
    // If the same field name is included twice at the same level, the fields should be kept
    // separate if they belong to different fragment types (e.g. Exhibition vs. ArtFairParticipation),
    // but should be merged if they belong to the same concrete type (e.g. both belong to ArtworkResults).

    return alias + '.' + (field.fragmentType || parentSchemaDef.name);
  } // for a given field in the query, get its return type from the schema


  getFieldReturnType(field, parentSchemaDef) {
    // Get the concrete type for fragment fields.
    // This is needed because for fragment fields, the original parentSchemaDef might be a union or interface type.
    if (field.fragmentType) {
      parentSchemaDef = this.info.schema.getType(field.fragmentType);
    }

    const schemaField = parentSchemaDef.getFields()[field.name];
    return schemaField && (0, _graphql.getNamedType)(schemaField.type);
  }

  mergeFieldSelections(selectionSet1, selectionSet2) {
    if (!Array.isArray(selectionSet1)) {
      throw Error('selectionSet1 must be an array');
    }

    if (!selectionSet2) {
      return [...selectionSet1];
    }

    const selectionSet1ByName = (0, _lodash.default)(selectionSet1, field => field.alias || field.name);

    const mergedFieldsByName = _objectSpread({}, selectionSet1ByName);

    for (const field of selectionSet2) {
      const alias = field.alias || field.name;
      const existingField = selectionSet1ByName[alias];

      if (existingField && existingField.fields && existingField.fragmentType === field.fragmentType) {
        const mergedField = _objectSpread({}, field);

        mergedField.fields = this.mergeFieldSelections(existingField.fields, field.fields);
        mergedFieldsByName[alias] = mergedField;
      } else {
        mergedFieldsByName[alias] = field;
      }
    }

    return Object.values(mergedFieldsByName);
  }

  isFragment(ast) {
    return ast.kind === 'InlineFragment' || ast.kind === 'FragmentSpread';
  }

  getAST(ast) {
    if (ast.kind === 'FragmentSpread') {
      const fragmentName = ast.name.value;
      return this.info.fragments[fragmentName];
    }

    return ast;
  }

  getSelections(ast) {
    if (ast && ast.selectionSet && ast.selectionSet.selections) {
      return ast.selectionSet.selections; //return (ast.selectionSet.selections: Object[])
    }

    return [];
  }

  argumentsFromAst(ast) {
    if (!ast) {
      return {};
    }

    const {
      variableValues
    } = this.info; // $FlowFixMe - this can be removed after Object.fromEntries() is in the standard flow lib

    const args = Object.fromEntries(ast.map(arg => {
      const name = arg.name.value; // TODO refactor to use valueFromAST() and pass type info in the expected format so that
      // we can support custom scalars as input arguments

      const val = (0, _graphql.valueFromASTUntyped)(arg.value, variableValues);
      return [name, val];
    }));
    return args;
  }

  directivesFromAst(ast) {
    if (!ast) {
      return {};
    } // $FlowFixMe


    return Object.fromEntries(ast.map(directive => {
      return [directive.name.value, this.argumentsFromAst(directive.arguments)];
    }));
  }

}