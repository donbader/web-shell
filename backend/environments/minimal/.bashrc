# Minimal Bash Configuration
export TERM=xterm-256color
export EDITOR=vim
export VISUAL=vim

# Minimal history
export HISTSIZE=1000
export HISTFILESIZE=2000
export HISTCONTROL=ignoreboth
shopt -s histappend

# Essential aliases
alias ls='ls --color=auto'
alias ll='ls -lh'
alias la='ls -lAh'
alias ..='cd ..'
alias ...='cd ../..'
alias h='history'
alias c='clear'

# Simple prompt
PS1='\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '

# Options
shopt -s checkwinsize
