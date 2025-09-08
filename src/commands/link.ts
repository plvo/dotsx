import {
	existsSync,
	lstatSync,
	mkdirSync,
	readdirSync,
	readlinkSync,
	rmSync,
	statSync,
	symlinkSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { confirm, select, text } from "@clack/prompts";
import { DOTFILE_PATH_DIRS } from "@/lib/constants";

export async function handleLink() {
	const action = await select({
		message: "What do you want to do with links?",
		options: [
			{ value: "status", label: "📋 Check link status" },
			{ value: "add", label: "➕ Add new link" },
			{ value: "sync", label: "🔄 Sync all links" },
		],
	});

	if (action === "status") await checkStatus();
	else if (action === "add") await addLink();
	else if (action === "sync") await syncLinks();
}

async function checkStatus() {
	console.log("\n📋 Links Status");
	console.log("═".repeat(30));

	const links = getLinks();
	if (links.length === 0) {
		console.log("ℹ️ No links found");
		return;
	}

	let correct = 0;
	for (const { linkPath, targetPath } of links) {
		const isCorrect = checkLink(linkPath, targetPath);
		const display = targetPath.replace(homedir(), "~");

		if (isCorrect) {
			console.log(`✅ ${display}`);
			correct++;
		} else {
			console.log(`❌ ${display}`);
		}
	}

	console.log(`\n${correct}/${links.length} links correct`);
}

async function addLink() {
	console.log("\n➕ Add Link");

	const input = await text({
		message: "Path to link:",
		placeholder: "~/.zshrc or /usr/local/bin/script",
		validate: (v) =>
			v && existsSync(expandPath(v)) ? undefined : "File doesn't exist",
	});

	if (!input) return;

	const targetPath = expandPath(String(input));
	const linkPath = getLinkPath(targetPath);

	// Create link directory
	mkdirSync(dirname(linkPath), { recursive: true });

	// Copy to links and create symlink
	if (statSync(targetPath).isDirectory()) {
		const { copyDirectory } = await import("@/lib/file");
		copyDirectory(targetPath, linkPath);
	} else {
		const { copyFileSync } = await import("node:fs");
		copyFileSync(targetPath, linkPath);
	}

	rmSync(targetPath, { recursive: true, force: true });
	symlinkSync(linkPath, targetPath);

	console.log(`✅ Added: ${String(input)}`);
}

async function syncLinks() {
	console.log("\n🔄 Sync Links");

	const links = getLinks();
	const broken = links.filter(
		({ linkPath, targetPath }) => !checkLink(linkPath, targetPath),
	);

	if (broken.length === 0) {
		console.log("✅ All links correct");
		return;
	}

	console.log(`\n⚠️ ${broken.length} broken links:`);
	broken.forEach(({ targetPath }) =>
		console.log(`   ${targetPath.replace(homedir(), "~")}`),
	);

	const proceed = await confirm({ message: "\nFix all broken links?" });
	if (!proceed) return;

	let fixed = 0;
	for (const { linkPath, targetPath } of broken) {
		try {
			if (existsSync(targetPath))
				rmSync(targetPath, { recursive: true, force: true });
			mkdirSync(dirname(targetPath), { recursive: true });
			symlinkSync(linkPath, targetPath);
			console.log(`✅ ${targetPath.replace(homedir(), "~")}`);
			fixed++;
		} catch (err) {
			console.log(`❌ ${targetPath.replace(homedir(), "~")}: ${err}`);
		}
	}

	console.log(`\n🎉 Fixed ${fixed}/${broken.length} links`);
}

function getLinks(): Array<{ linkPath: string; targetPath: string }> {
	if (!existsSync(DOTFILE_PATH_DIRS.LINKS)) return [];

	const scan = (
		dir: string,
		rel = "",
	): Array<{ linkPath: string; targetPath: string }> => {
		const results: Array<{ linkPath: string; targetPath: string }> = [];

		for (const item of readdirSync(dir)) {
			const fullPath = resolve(dir, item);
			const relPath = rel ? `${rel}/${item}` : item;

			if (statSync(fullPath).isDirectory()) {
				results.push(...scan(fullPath, relPath));
			} else {
				results.push({
					linkPath: fullPath,
					targetPath: getTargetPath(relPath),
				});
			}
		}

		return results;
	};

	return scan(DOTFILE_PATH_DIRS.LINKS);
}

function checkLink(linkPath: string, targetPath: string): boolean {
	if (!existsSync(targetPath)) return false;
	if (!lstatSync(targetPath).isSymbolicLink()) return false;

	const actualTarget = readlinkSync(targetPath);
	return resolve(dirname(targetPath), actualTarget) === linkPath;
}

function getLinkPath(systemPath: string): string {
	const home = homedir();
	if (systemPath.startsWith(home)) {
		return resolve(
			DOTFILE_PATH_DIRS.LINKS,
			"~" + systemPath.slice(home.length),
		);
	}
	return resolve(
		DOTFILE_PATH_DIRS.LINKS,
		systemPath.startsWith("/") ? systemPath.slice(1) : systemPath,
	);
}

function getTargetPath(relativePath: string): string {
	if (relativePath.startsWith("~/")) {
		return resolve(homedir(), relativePath.slice(2));
	}
	return "/" + relativePath;
}

function expandPath(path: string): string {
	return path.startsWith("~/") ? resolve(homedir(), path.slice(2)) : path;
}
