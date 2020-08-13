# AWS CodeCommit to Github
Mirgrate an AWS CodeCommit repository to Github

## Install
```bash
npm install -g @jwerre/codecommit-to-github
```

## Setup
Be sure and have your AWS profile [configured](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html).
Be sure you have your Github [personal access token](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token')

## Examples
```bash
codecommit-to-github  --help

Mirgrate an AWS CodeCommit repository to Github

Usage: codecommit-to-github --username myusername --password 1234abcd ./path/to/my/repo

Options:
-t, --token		    Github auth token.
-r, --remote		Name of remote to migrate (default: 'origin').
-a, --aws-profile	AWS profile name (default: 'default').
-o, --organization	Name of organization to create repo under instead of user.
-p, --public		Whether the github repo should be public, defaults to private.
-h, --help  		Show help.
-v, --verbose		Verbose output.
-d, --dry	    	Perform a dry run.

```