import esbuild from 'esbuild';
import glob from 'fast-glob';
import fs from 'fs';
import path from 'path';

const target = 'dist';

fs.rmSync(target, { recursive: true, force: true });

function normalize(...args) {
	let target = path.join(...args);

	if (target !== '.') {
		target = './' + target;
	}

	return target;
}

function build(file) {
	const dir = path.dirname(file).slice(4);
	const ext = path.extname(file);
	const name = path.basename(file, ext);
	const is_default_module = name === 'index';

	const import_file = normalize(dir, name + '.js');
	const type_file = normalize('types', dir, name + '.d.ts');
	// const require_file = normalize(dir, name + '.cjs');

	const default_options = {
		entryPoints: [file],
		minify: true,
	};

	esbuild.buildSync({
		...default_options,
		outfile: path.join(target, import_file),
		format: 'esm',
	});

	// esbuild.buildSync({
	// 	...default_options,
	// 	outfile: path.join(target, require_file),
	// 	format: 'cjs',
	// });

	if (dir && is_default_module) {
		fs.writeFileSync(
			path.join(target, dir, 'index.d.ts'),
			`export * from '../types/${dir}/index';`,
		);
		fs.writeFileSync(
			path.join(target, dir, 'package.json'),
			JSON.stringify(
				{
					type: 'module',
					// main: './index.cjs',
					module: './index.js',
					types: './index.d.ts',
				},
				null,
				'  ',
			),
		);
	}

	const module_name = normalize(dir, is_default_module ? '' : name);

	return {
		[module_name]: {
			types: type_file,
			import: import_file,
			// require: require_file,
		},
	};
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

delete pkg.scripts;
delete pkg.devDependencies;
delete pkg.publishConfig;

pkg.module = 'index.js';
// pkg.main = 'index.cjs';
pkg.types = 'types/index.d.ts';
pkg.exports = {
	'./package.json': './package.json',
	'./types': './types/index.d.ts',
	...glob
		.sync('src/**/*.ts', {
			ignore: ['**/*.spec.ts'],
		})
		.reduce((exports, file) => {
			return {
				...exports,
				...build(file),
			};
		}, {}),
};

fs.writeFileSync(`${target}/package.json`, JSON.stringify(pkg, null, '  '), 'utf8');
