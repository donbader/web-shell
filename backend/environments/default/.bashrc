# Default Bash Configuration
export TERM=xterm-256color
export EDITOR=vim
export VISUAL=vim

# Enhanced history
export HISTSIZE=10000
export HISTFILESIZE=20000
export HISTTIMEFORMAT='%F %T '
export HISTCONTROL=ignoreboth:erasedups
shopt -s histappend

# Completion
if [ -f /etc/bash_completion ]; then
  . /etc/bash_completion
fi
bind "set completion-ignore-case on" 2>/dev/null
bind "set show-all-if-ambiguous on" 2>/dev/null
bind "set mark-directories on" 2>/dev/null
bind "set colored-stats on" 2>/dev/null
bind "set visible-stats on" 2>/dev/null

# Shell options
shopt -s cdspell 2>/dev/null
shopt -s dirspell 2>/dev/null
shopt -s globstar 2>/dev/null
shopt -s checkwinsize

# Aliases - navigation
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias -- -='cd -'

# Aliases - listing
alias ls='ls --color=auto'
alias ll='ls -lh'
alias la='ls -lAh'
alias lt='ls -lhtr'

# Aliases - utilities
alias grep='grep --color=auto'
alias h='history'
alias c='clear'
alias df='df -h'
alias du='du -h'
alias psa='ps aux'

# Git aliases
if command -v git &> /dev/null; then
  alias gs='git status'
  alias ga='git add'
  alias gc='git commit'
  alias gp='git push'
  alias gl='git log --oneline --graph --decorate'
  alias gd='git diff'
fi

# Prompt
PS1='\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '

# Welcome message
echo ""
echo "🐚 Web Shell - Default Environment (bash)"
echo "Node: $(node --version 2>/dev/null || echo 'N/A')"
echo "Directory: $(pwd)"
echo ""
