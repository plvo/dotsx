import { copyFile, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { multiselect } from "@clack/prompts";
import { DOTFILES_PATH } from "@/lib/constants";
import { copyDirectory } from "@/lib/file";

export async function handleInit() {
	console.log("\n🔧 Dotfiles Initialization");

	const components = await multiselect({
		message: "What do you want to initialize in your dotfiles?",
		required: true,
		options: [
			{ value: "core-debian", label: "📦 Core - Debian" },
			{ value: "home-zshrc", label: "🏠 Home - zshrc" },
			{ value: "home-tmux", label: "🏠 Home - Tmux" },
			{ value: "ide-cursor", label: "💻 IDE - Cursor" },
			{ value: "ide-vscode", label: "💻 IDE - Vscode" },
		],
	});

	if (Array.isArray(components)) {
		if (components.includes("core-debian")) {
			const templateDir = resolve(process.cwd(), "templates/core/debian");
			const targetPath = resolve(DOTFILES_PATH, "core/debian");
			copyDirectory(templateDir, targetPath);
		}

		if (components.some((component) => component.startsWith("home-"))) {
			mkdirSync(resolve(DOTFILES_PATH, "home"), { recursive: true });
		}

		if (components.includes("home-zshrc")) {
			const templateFile = resolve(process.cwd(), "templates/home/.zshrc");
			const targetPath = resolve(DOTFILES_PATH, "home/.zshrc");

			copyFile(templateFile, targetPath, (err) => {
				if (err) {
					console.error(`❌ Error copying file: ${err}`);
				} else {
					console.log(`✅ File copied: ${targetPath}`);
				}
			});
		}

		if (components.includes("home-tmux")) {
			const templateFile = resolve(process.cwd(), "templates/home/.tmux.conf");
			const targetPath = resolve(DOTFILES_PATH, "home/.tmux.conf");

			copyFile(templateFile, targetPath, (err) => {
				if (err) {
					console.error(`❌ Error copying file: ${err}`);
				} else {
					console.log(`✅ File copied: ${targetPath}`);
				}
			});
		}

		if (components.some((component) => component.startsWith("ide-"))) {
			mkdirSync(resolve(DOTFILES_PATH, "ide"), { recursive: true });
		}

		if (components.includes("ide-cursor")) {
			const templateDir = resolve(process.cwd(), "templates/ide/cursor");
			const targetPath = resolve(DOTFILES_PATH, "ide/cursor");

			copyDirectory(templateDir, targetPath);
		}

		if (components.includes("ide-vscode")) {
			const templateDir = resolve(process.cwd(), "templates/ide/vscode");
			const targetPath = resolve(DOTFILES_PATH, "ide/vscode");

			copyDirectory(templateDir, targetPath);
		}
	}

	try {
		console.log(`\n🎉 Dotfiles initialized in: ${DOTFILES_PATH}`);
		console.log("💡 You can now use the installation commands!");
	} catch (error) {
		console.error(`❌ Error during initialization: ${String(error)}`);
	}
}
