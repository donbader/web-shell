# Minimal ZSH Configuration
export TERM=xterm-256color
export EDITOR=vim
export VISUAL=vim

# Minimal history
HISTFILE=~/.zsh_history
HISTSIZE=1000
SAVEHIST=1000
setopt HIST_IGNORE_DUPS
setopt SHARE_HISTORY

# Essential aliases
alias ls='ls --color=auto'
alias ll='ls -lh'
alias la='ls -lAh'
alias ..='cd ..'
alias ...='cd ../..'
alias h='history'
alias c='clear'

# Simple prompt
PROMPT='%F{green}%n@%m%f:%F{blue}%~%f$ '

# Options
setopt NO_BEEP
setopt INTERACTIVE_COMMENTS
