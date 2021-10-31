import * as vscode from 'vscode';
import { LiveMatchesProvider } from './liveMatches';
import { ScoreBoardProvider } from './scoreboard';
var fetchUrl = require("fetch").fetchUrl;
const htmlparser2 = require('htmlparser2');

let myStatusBarItem: vscode.StatusBarItem;
let turnOff = false;
let matchId: any = '';
let teamName: any = 'india';
let allMatches: Array<any> = [];
let interval: any;

export function activate1({ subscriptions }: vscode.ExtensionContext) {
	subscriptions.push(vscode.commands.registerCommand('cricketscore.liveScore', async () => {
		setImmediate(fetchScore);
		interval = setInterval(fetchScore, 10000);
	}));
	const myCommandId = 'cricketscore.showLiveScore';
	subscriptions.push(vscode.commands.registerCommand(myCommandId, async () => {
		const types = ['Live Matches', 'Team Name', 'Turn Off'];
		vscode.window.showQuickPick(types, { canPickMany: false }).then(async type => {
			switch (type) {
				case 'Live Matches':
					const matches: Array<string> = allMatches.map(match => {
						let arr = match.link.split("/");
						return `${arr[arr.length - 1].split(".")[0]}:${match.title}`;
					});
					vscode.window.showQuickPick(matches, { canPickMany: false }).then(match => {
						matchId = match?.split(":")[0];
					});
					break;
				case 'Team Name':
					teamName = await vscode.window.showInputBox({ placeHolder: ' Enter Team name' });
					matchId = '';
					break;
				case 'Turn Off':
					turnOff = true;
					myStatusBarItem.hide();
					if(interval){
						interval.clearInterval();
					}
					break;
				default:
					console.log("Wrong Option");
					break;
			};
		});
		if(!turnOff){
			interval = setInterval(fetchScore, 10000);
		}
	}));

	// create a new status bar item that we can now manage
	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	myStatusBarItem.command = myCommandId;
	subscriptions.push(myStatusBarItem);

	// update status bar item once at start
	setImmediate(fetchScore);
	if (interval) {
		interval.clearInterval();
	}
	if(!turnOff){
		interval = setInterval(fetchScore, 10000);
	}
	else if(interval){
		interval.clearInterval();
		myStatusBarItem.hide();
	}
}

export function activate({ subscriptions }: vscode.ExtensionContext) {
	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

	// Samples of `window.registerTreeDataProvider`
	let liveMatchesProvider = new LiveMatchesProvider(rootPath);
	console.log("liveScoreboardProvider", liveMatchesProvider);
	vscode.window.registerTreeDataProvider('liveMatches', liveMatchesProvider);
	// vscode.commands.registerCommand('nodeDependencies.refreshEntry', () => nodeDependenciesProvider.refresh());
	vscode.commands.registerCommand('extension.openMatch', 
		moduleName => {
			console.log(moduleName);
			let liveScoreboardProvider = new ScoreBoardProvider(moduleName);
			vscode.window.registerTreeDataProvider('liveMatches', liveScoreboardProvider);
			//return vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`http://www.cricinfo.com/ci/engine/match/1273736.html`))
		});
	// vscode.commands.registerCommand('nodeDependencies.addEntry', () => vscode.window.showInformationMessage(`Successfully called add entry.`));
	// vscode.commands.registerCommand('nodeDependencies.editEntry', (node: Dependency) => vscode.window.showInformationMessage(`Successfully called edit entry on ${node.label}.`));
	// vscode.commands.registerCommand('nodeDependencies.deleteEntry', (node: Dependency) => vscode.window.showInformationMessage(`Successfully called delete entry on ${node.label}.`));
}

function fetchScore() {
	const url = "http://static.cricinfo.com/rss/livescores.xml";
	fetchUrl(`${url}`, (err: any, meta: any, body: any) => {

		const dom: any = htmlparser2.parseFeed(body.toString());
		allMatches = dom.items ? dom.items : [];

		let myMatches = [];

		if (matchId !== '') {
			const regex = new RegExp(matchId, 'i');
			myMatches = allMatches.filter((item: { link: string; }) => item.link.search(regex) !== -1);
			teamName = '';
		}
		else {
			if (teamName === '') {
				teamName = 'india';
				matchId = '';
			};
			const regex = new RegExp(teamName, 'i');
			myMatches = allMatches.filter((item: { title: string; }) => item.title.search(regex) !== -1);
		}
		if (myMatches.length < 1) {
			if (allMatches.length > 0) {
				myMatches = [allMatches[0]];
			}
			else {
				vscode.window.showInformationMessage('Selected Matches Not Available / No Live Message');
			}
		}
		for (let match of myMatches) {
			myStatusBarItem.text = match.title;
		}
		myStatusBarItem.color = 'yellow';
		myStatusBarItem.show();
	});
}

// this method is called when your extension is deactivated
export function deactivate() { }
