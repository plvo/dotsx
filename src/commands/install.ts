import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { confirm, multiselect } from "@clack/prompts";
import { DOTFILES_PATH } from "@/lib/constants";

export async function handleInstall() {
	console.log("\n📦 Package Installation");
	console.log("═".repeat(50));

	const debianPath = resolve(DOTFILES_PATH, "core/debian");
	const aptFile = resolve(debianPath, "apt.txt");
	const snapFile = resolve(debianPath, "snap.txt");

	const availableInstallers: string[] = [];

	if (existsSync(aptFile)) {
		availableInstallers.push("apt");
	}

	if (existsSync(snapFile)) {
		availableInstallers.push("snap");
	}

	if (availableInstallers.length === 0) {
		console.log("❌ No package files found in core/debian/");
		console.log("💡 Create apt.txt or snap.txt files to get started");
		return;
	}

	const selectedInstallers = await multiselect({
		message: "Which package managers do you want to use?",
		options: availableInstallers.map((installer) => ({
			value: installer,
			label: installer === "apt" ? "📦 APT packages" : "📱 Snap packages",
		})),
		required: true,
	});

	if (!Array.isArray(selectedInstallers) || selectedInstallers.length === 0) {
		console.log("❌ No installers selected");
		return;
	}

	for (const installer of selectedInstallers) {
		if (installer === "apt") {
			await handleAptPackages(aptFile);
		} else if (installer === "snap") {
			await handleSnapPackages(snapFile);
		}
	}

	console.log("\n🎉 Installation complete!");
}

async function handleAptPackages(aptFile: string) {
	console.log("\n📦 APT Packages");
	console.log("─".repeat(30));

	const packages = readPackageFile(aptFile);
	if (packages.length === 0) {
		console.log("ℹ️ No packages found in apt.txt");
		return;
	}

	console.log("🔍 Checking package status...");
	const packageInfo = packages.map((pkg) => ({
		name: pkg,
		installed: isAptPackageInstalled(pkg),
	}));

	const toInstall = packageInfo.filter((pkg) => !pkg.installed);
	const installed = packageInfo.filter((pkg) => pkg.installed);

	if (installed.length > 0) {
		console.log(`\n✅ Already installed (${installed.length}):`);
		installed.forEach((pkg) => console.log(`   ${pkg.name}`));
	}

	if (toInstall.length === 0) {
		console.log("✅ All APT packages are already installed");
		return;
	}

	console.log(`\n📋 Need to install (${toInstall.length}):`);
	toInstall.forEach((pkg) => console.log(`   ${pkg.name}`));

	const proceed = await confirm({
		message: `\nInstall ${toInstall.length} APT packages?`,
	});

	if (!proceed) {
		console.log("❌ APT installation cancelled");
		return;
	}

	console.log("\n🔄 Installing APT packages...");
	for (const pkg of toInstall) {
		try {
			console.log(`📦 Installing ${pkg.name}...`);
			execSync(`sudo apt install -y ${pkg.name}`, { stdio: "pipe" });
			console.log(`✅ ${pkg.name}`);
		} catch (error) {
			console.log(`❌ ${pkg.name}: ${error}`);
		}
	}
}

async function handleSnapPackages(snapFile: string) {
	console.log("\n📱 Snap Packages");
	console.log("─".repeat(30));

	const packages = readPackageFile(snapFile);
	if (packages.length === 0) {
		console.log("ℹ️ No packages found in snap.txt");
		return;
	}

	console.log("🔍 Checking package status...");
	const packageInfo = packages.map((pkg) => ({
		name: pkg,
		installed: isSnapPackageInstalled(pkg),
	}));

	const toInstall = packageInfo.filter((pkg) => !pkg.installed);
	const installed = packageInfo.filter((pkg) => pkg.installed);

	if (installed.length > 0) {
		console.log(`\n✅ Already installed (${installed.length}):`);
		installed.forEach((pkg) => console.log(`   ${pkg.name}`));
	}

	if (toInstall.length === 0) {
		console.log("✅ All Snap packages are already installed");
		return;
	}

	console.log(`\n📋 Need to install (${toInstall.length}):`);
	toInstall.forEach((pkg) => console.log(`   ${pkg.name}`));

	const proceed = await confirm({
		message: `\nInstall ${toInstall.length} Snap packages?`,
	});

	if (!proceed) {
		console.log("❌ Snap installation cancelled");
		return;
	}

	console.log("\n🔄 Installing Snap packages...");
	for (const pkg of toInstall) {
		try {
			console.log(`📱 Installing ${pkg.name}...`);
			execSync(`sudo snap install ${pkg.name}`, { stdio: "pipe" });
			console.log(`✅ ${pkg.name}`);
		} catch (error) {
			console.log(`❌ ${pkg.name}: ${error}`);
		}
	}
}

function readPackageFile(filePath: string): string[] {
	try {
		const content = readFileSync(filePath, "utf8");
		return content
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith("#"));
	} catch (error) {
		console.error(`❌ Error reading ${filePath}: ${error}`);
		return [];
	}
}

function isAptPackageInstalled(packageName: string): boolean {
	try {
		const output = execSync(`dpkg -l | grep "^ii.*${packageName}"`, {
			stdio: "pipe",
		}).toString();
		return output.trim().length > 0;
	} catch {
		return false;
	}
}

function isSnapPackageInstalled(packageName: string): boolean {
	try {
		execSync(`snap list ${packageName}`, { stdio: "pipe" });
		return true;
	} catch {
		return false;
	}
}
