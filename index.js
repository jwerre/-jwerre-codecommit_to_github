#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2));
const AWS = require('aws-sdk');
const {execSync, exec} = require('child_process');
const {inspect} = require('util');
const GitHub = require('github-api');

const DEFAULT_REMOTE = 'origin';

const path = argv._[0] || process.cwd();
const gitToken = argv.t || argv.token;
const remote = argv.r || argv.remote || DEFAULT_REMOTE;
const organization = argv.o || argv.organization ;
const profile = argv.a || argv['aws-profile'];
const isPublic = argv.public;
const verbose = argv.v || argv.verbose;
const dry = argv.d || argv.dry;

// function wait(milliseconds=2000) {
// 	return new Promise( resolve => setTimeout(resolve, milliseconds) );
// }

function showHelp () {
	console.log(`
Mirgrate an AWS CodeCommit repository to Github

Usage: codecommit-to-github --token <your_token> ./path/to/my/repo

Options:
-t, --token		Github auth token.
-r, --remote		Remote name to migrate (default: '${DEFAULT_REMOTE}').
-a, --aws-profile	AWS profile name (default: 'default').
-o, --organization	Name of organization to create repo for instead of user.
-p, --public		Whether the github repo should be public, defaults to private.
-h, --help		Show help.
-v, --verbose		Verbose output.
-d, --dry		Perform a dry run.`);
	
}

function gitPush (uri) {

	try {
		execSync(`git remote set-url ${remote} ${uri}`);
	} catch (err) {
		return Promise.reject(err);
	}

	return new Promise( function(resolve, reject){

		exec(`git push ${remote} master --tags`, function(err, res){

			if (err) {
				return reject(err);
			}

			return resolve(res);

		});

	});

}

function createRepo (args) {

	if (!gitToken || !gitToken.length) {
		return Promise.reject(new Error('Personal access token required: https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token'));
	}
	
	const github = new GitHub({
		token: gitToken,
	});

	let entity;

	if (organization && organization.length) {
		entity = github.getOrganization(organization);
	} else {
		entity = github.getUser();
	}

	const options = {
		name: args.repositoryName,
		description: args.repositoryDescription,
		private: !isPublic,
	};

	if (dry) {
		if (verbose) {
			console.log('Dry run...');
		}
		return Promise.resolve(options);
	}

	return entity.createRepo(options);
	
}

async function getRepo () {

	const details = getRepoDetails();

	const codecommit = new AWS.CodeCommit({region:details.region});

	if (profile && profile.length) {
		AWS.config.credentials = new AWS.SharedIniFileCredentials(
			{
				profile: profile
			}
		);
	}

	let repository;

	try {
		repository = await codecommit
			.getRepository({repositoryName:details.name})
			.promise();
	} catch (err) {
		return Promise.reject(err);
	}

	return Promise.resolve(repository.repositoryMetadata);
	
}

function getRepoDetails () {

	let remoteUrl = execSync(`git remote get-url --push ${remote}`);

	if (!remoteUrl || !remoteUrl.length) {
		throw new Error(`No git repository in path: ${process.cwd()}`);
	}

	remoteUrl = remoteUrl.toString();

	if (!/codecommit/.test(remoteUrl)) {
		throw new Error(`Not an AWS codecommit repository at: ${process.cwd()}`);
	}

	let url = new URL(remoteUrl);

	return {
		url: url,
		region: url.hostname.split('.')[1],
		name: url.pathname.split('/').pop(),
	};

}

( async () => {

	if (argv.h || argv.help) {
		showHelp();
		return Promise.resolve();
	}

	let repo, res;

	if (path && path.length) {
		process.chdir(path);
	}
	
	try {
		repo = await getRepo();
	} catch (e) {
		return Promise.reject(e);
	}
	
	if (verbose) {
		console.log( inspect(repo, {depth:10, colors:true}) );
	}

	try {
		res = await createRepo(repo);
	} catch (err) {
		return Promise.reject(err);
	}

	if (verbose) {
		console.log(`Pushing file to new repository: ${res.data.ssh_url}`);
	}

	try {
		await gitPush(res.data.ssh_url);
	} catch (err) {
		return Promise.reject(err);
	}
	
	return res.data;

})()
	.then( (res) => {

		if (verbose && res) {
			console.log( inspect(res, {depth:10, colors:true}) );
		}

		process.exit(0);

	})
	.catch( (err) => {
		console.error(err);
		process.exit(1);
	});
