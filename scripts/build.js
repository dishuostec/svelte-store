import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

function normalize(...args) {
	let target = path.join(...args);

	if (target !== '.') {
		target = './' + target;
	}

	return target;
}

function write_package_json(dir, json) {
	fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(json, null, '  '), 'utf-8');
}

const target = 'dist';

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target);

['README.md'].forEach((file) => {
	fs.copyFileSync(file, normalize(target, file));
});

const module_exports = { './package.json': './package.json' };

fs.readdirSync('src')
	.filter((dir) => fs.statSync(`src/${dir}`).isDirectory())
	.forEach((dir) => {
		const outdir = path.join(target, dir);

		const files = fs.readdirSync(`src/${dir}`).filter((file) => !file.endsWith('.spec.ts'));

		const entryPoints = files.map((file) => normalize('src', dir, file));
		esbuild.buildSync({
			entryPoints,
			minify: true,
			outdir: outdir,
			format: 'esm',
		});

		const pkg_info = {
			type: 'module',
		};

		if (files.includes('index.ts')) {
			Object.assign(pkg_info, {
				main: './index',
				module: './index.js',
				types: './index.d.ts',
			});
		} else {
			const exports = {
				'./package.json': './package.json',
			};

			files.forEach((file) => {
				const ext = path.extname(file);
				const basename = path.basename(file, ext);
				exports['./' + basename] = {
					types: './' + basename + '.d.ts',
					import: './' + basename + '.js',
				};
			});

			Object.assign(pkg_info, { exports });
		}

		write_package_json(outdir, pkg_info);

		files.forEach((file) => {
			const ext = path.extname(file);
			const basename = path.basename(file, ext);

			const module_path = [dir === 'origin' ? '.' : dir];
			if (basename !== 'index') {
				module_path.push(basename);
			}

			const module = normalize(...module_path);
			module_exports[module] = {
				types: `./${dir}/${basename}.d.ts`,
				import: `./${dir}/${basename}.js`,
			};
		});
	});

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

delete pkg.scripts;
delete pkg.devDependencies;
delete pkg.publishConfig.directory;

pkg.module = 'origin/index.js';
pkg.types = 'origin/index.d.ts';
pkg.exports = module_exports;

write_package_json(target, pkg);

import { run } from './fix-js-ext.js';

run('./dist');
