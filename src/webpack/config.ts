import path from 'path'
import fs from 'fs'
import * as webpack from 'webpack'
import { merge } from 'webpack-merge'

import TerserPlugin from 'terser-webpack-plugin'
import { ModifySourcePlugin } from 'modify-source-webpack-plugin'

import {
  createComponentIndex,
  resolveTsconfigPathsToAlias,
  tempPath
} from './utils'

// * Project Package Json
const packageJsonPath = path.resolve(process.cwd(), 'package.json')
const packageJson = fs.existsSync(packageJsonPath)
  ? require(packageJsonPath)
  : {}

// * Project Webpack Config
const projectConfigPath = path.resolve(process.cwd(), 'webpack.config')
const projectConfig = fs.existsSync(projectConfigPath)
  ? require(projectConfigPath)?.default
  : {}

// * Auto generate entry file
createComponentIndex()

// * Framework Webpack Config
const config: webpack.Configuration = {
  mode: 'production',
  entry: {
    // * Auto generated entry file
    app: path.join(tempPath, 'index.ts')
  },
  output: {
    path: path.resolve(process.cwd(), 'export'),
    filename: `${packageJson.name}-${packageJson.version}.js`
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      ...resolveTsconfigPathsToAlias({
        tsconfigPath: path.resolve(process.cwd(), 'tsconfig.json'),
        webpackConfigBasePath: process.cwd()
      }),
      react: 'preact/compat',
      'react-dom': 'preact/compat'
    }
  },
  plugins: [
    /**
     * @description
     * The react-to-webcomponent module binds
     * web component properties through "proptypes" information.
     * But typescript do not usually define "proptypes",
     * so defined automatically through babel-plugin-types-to-proptypes.
     *
     * However, babel-plugin-typescript-to-proptypes requires
     * expressions such as import React,
     * which is not used in React 17, so it is added artificially.
     *
     * This expression is automatically deleted as unused code from the final build.
     */
    new ModifySourcePlugin({
      rules: [
        {
          test: /\.(ts|tsx)$/,
          modify: (src) => {
            const importCode = `import _forProptypes from 'react'`
            return src.includes(importCode) ? src : `${importCode};\n${src}`
          }
        }
      ]
    })
  ],
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /(node_modules|bower_components)/,
        use: [
          { loader: 'ts-loader' },
          {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-react',
                  {
                    runtime: 'automatic',
                    importSource: 'preact-jsx-runtime'
                  }
                ]
              ],
              plugins: ['babel-plugin-typescript-to-proptypes']
            }
          }
        ]
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()]
  }
}

export default merge(config, projectConfig)
