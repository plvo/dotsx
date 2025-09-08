#!/usr/bin/env bun
import { intro, outro, select } from "@clack/prompts";
import { handleInit } from "./commands/init";
import { handleInstall } from "./commands/install";
import { handleLink } from "./commands/link";
import { displayInfo, getSystemInfo } from "./lib/system";

async function main() {
	intro("🚀 Dotfiles CLI");

	const systemInfo = getSystemInfo();

	displayInfo(systemInfo);

	const action = await select({
		message: "What do you want to do?",
		options: [
			{ value: "init", label: "🔧 Initialize dotfiles" },
			{ value: "install", label: "📦 Install packages" },
			{ value: "link", label: "📋 Link files" },
			{ value: "exit", label: "👋 Exit" },
		],
	});

	if (action === "init") {
		await handleInit();
	} else if (action === "install") {
		await handleInstall();
	} else if (action === "link") {
		await handleLink();
	}

	outro("✨ Bye!");
}

main().catch(console.error);
