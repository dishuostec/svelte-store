import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

function build(outdir, format, ext = '.js') {
	const base = 'src';

	const entrypoints = findEntryponts(
		base,
		(file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'),
	);

	esbuild.buildSync({
		entryPoints: entrypoints,
		minify: true,
		outdir,
		format,
		outExtension: { '.js': ext },
	});
}

function findEntryponts(base, filter) {
	const entrypoints = [];

	fs.readdirSync(base).forEach((item) => {
		const stat = fs.statSync(`${base}/${item}`);

		if (stat.isFile()) {
			if (!filter || filter(item)) entrypoints.push(path.join(base, item));
		} else if (stat.isDirectory()) {
			entrypoints.push(...findEntryponts(path.join(base, item), filter));
		}
	});

	return entrypoints;
}

function generateExports(base) {
	const distPkg = getBasePkg();

	distPkg.main = './index.cjs';
	distPkg.module = './index.js';

	const exports = (distPkg.exports = {
		'.': exportEntrypoint('./index.js'),
		'./package.json': './package.json',
	});

	fs.readdirSync(base)
		.filter((dir) => fs.statSync(`${base}/${dir}`).isDirectory() && dir !== 'core')
		.forEach((dir) => {
			fs.readdirSync(`${base}/${dir}`)
				.filter((file) => file.endsWith('.js'))
				.forEach((file) => {
					const subdir = path.join(dir, path.basename(file, '.js'));
					const filepath = './' + path.join(dir, file);

					exports[`./${subdir}`] = exportEntrypoint(filepath);
				});
		});

	fs.writeFileSync(path.join(base, 'package.json'), JSON.stringify(distPkg, null, '\t'), 'utf-8');
}

function exportEntrypoint(file) {
	return {
		import: file,
		require: file.slice(0, -2) + 'cjs',
	};
}

function getBasePkg() {
	const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

	const fieldList = [
		'name',
		'version',
		'type',
		'description',
		'keywords',
		'repository',
		'author',
		'license',
		'bugs',
		'homepage',
		'peerDependencies',
		'dependencies',
	];

	const basePkg = {};
	for (const field of fieldList) {
		basePkg[field] = pkg[field];
	}

	return basePkg;
}

const target = 'dist';

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target);

['README.md'].forEach((file) => {
	fs.copyFileSync(file, path.join(target, file));
});

build(target, 'esm');
build(target, 'cjs', '.cjs');
generateExports(target);
