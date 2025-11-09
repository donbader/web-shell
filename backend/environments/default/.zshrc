# Default ZSH Configuration
export TERM=xterm-256color
export EDITOR=vim
export VISUAL=vim

# Enhanced history
HISTFILE=~/.zsh_history
HISTSIZE=10000
SAVEHIST=10000
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_SPACE
setopt HIST_REDUCE_BLANKS
setopt HIST_VERIFY
setopt SHARE_HISTORY
setopt APPEND_HISTORY
setopt INC_APPEND_HISTORY

# Completion
autoload -Uz compinit
compinit -d ~/.zcompdump
setopt COMPLETE_IN_WORD
setopt AUTO_MENU
setopt AUTO_LIST
setopt AUTO_PARAM_SLASH
zstyle ':completion:*' matcher-list 'm:{a-zA-Z}={A-Za-z}'
zstyle ':completion:*' list-colors ${(s.:.)LS_COLORS}
zstyle ':completion:*' menu select

# Navigation
setopt AUTO_CD
setopt AUTO_PUSHD
setopt PUSHD_IGNORE_DUPS

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
alias free='free -h'
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

# Auto-suggestions
if [[ -f /usr/share/zsh/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh ]]; then
  source /usr/share/zsh/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh
  ZSH_AUTOSUGGEST_STRATEGY=(history completion)
fi

# Syntax highlighting
if [[ -f /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh ]]; then
  source /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
fi

# Prompt with environment indicator
setopt PROMPT_SUBST
autoload -U colors && colors
PROMPT='%F{green}%n@%m%f:%F{blue}%~%f %F{yellow}[${ENVIRONMENT:-unknown}]%f$ '
RPROMPT='%F{8}%*%f'

# Options
setopt CORRECT
setopt NO_BEEP
setopt INTERACTIVE_COMMENTS

# Welcome message
echo ""
echo "🐚 Web Shell - Default Environment (zsh)"
echo "Node: $(node --version 2>/dev/null || echo 'N/A')"
echo "Directory: $(pwd)"
echo ""
