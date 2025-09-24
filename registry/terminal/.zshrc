# zsh
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="crcandy"
plugins=(
	git
	vscode
	nvm
)

autoload -Uz compinit && compinit
source $ZSH/oh-my-zsh.sh
export DISABLE_MAGIC_FUNCTIONS=true
ZSH_DISABLE_COMPFIX=true

