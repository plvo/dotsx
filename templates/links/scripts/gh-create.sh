if [ $# -lt 1 ]; then
    echo "Usage: gh-create <owner/repo-name>"
    return 1
fi

gh repo create "$1" --private --push -s .
