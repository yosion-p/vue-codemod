import wrap from '../src/wrapAstTransformation'
import type { ASTTransformation } from '../src/wrapAstTransformation'
import { getCntFunc } from '../src/report'

export const transformAST: ASTTransformation = ({ root, j }) => {
  const cntFunc = getCntFunc('global-filter', global.outputReport)
  // find the createApp()
  const appDeclare = root.find(j.VariableDeclarator, {
    id: { type: 'Identifier' },
    init: {
      type: 'CallExpression',
      callee: {
        object: {
          name: 'Vue'
        },
        property: {
          name: 'createApp'
        }
      }
    }
  })

  if (!appDeclare.length) {
    return
  }
  const appName = appDeclare.at(0).get().node.id.name

  // Vue.filter('filterName', function(value) {}) =>
  // app.config.globalProperties.$filters = { filterName(value) {} }
  const filters = root.find(j.ExpressionStatement, {
    expression: {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'Vue' },
        property: { type: 'Identifier', name: 'filter' }
      }
    }
  })
  if (!filters.length) {
    return
  }

  cntFunc()
  const methods = []
  for (let i = 0; i < filters.length; i++) {
    const filter = filters.at(i)
    const args = filter.get().node.expression.arguments

    methods.push(
      j.objectMethod(
        'method',
        j.identifier(args[0].value),
        args[1].params,
        args[1].body
      )
    )
  }

  filters
    .at(0)
    .insertBefore(
      j.expressionStatement(
        j.assignmentExpression(
          '=',
          j.memberExpression(
            j.identifier(appName),
            j.identifier('config.globalProperties.$filters'),
            false
          ),
          j.objectExpression(methods)
        )
      )
    )

  for (let i = 0; i < filters.length; i++) {
    filters.at(i).remove()
  }
}

export default wrap(transformAST)
export const parser = 'babylon'
