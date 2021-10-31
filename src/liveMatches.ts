import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
const axios = require("axios");
const moment = require('moment');

export class LiveMatchesProvider implements vscode.TreeDataProvider<LiveMatchDependency> {

    private _onDidChangeTreeData: vscode.EventEmitter<LiveMatchDependency | undefined | void> = new vscode.EventEmitter<LiveMatchDependency | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<LiveMatchDependency | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private workspaceRoot: string | undefined) {
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: LiveMatchDependency): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: LiveMatchDependency): Promise<LiveMatchDependency[]> {
        let matches = await this.getDepsInPackageJson();
        //console.log("MATCHES", matches);
        return Promise.resolve(matches);
    }

    /**
     * Given the path to package.json, read all its dependencies and devDependencies.
     */
    private getDepsInPackageJson(): LiveMatchDependency[] {
        console.log("moment", moment().format('YYYY-MM-DD'));
        const url = `https://cricket-live-data.p.rapidapi.com/fixtures-by-date/${moment().format('YYYY-MM-DD')}`;
        const options = {
            headers: {
                'x-rapidapi-host': 'cricket-live-data.p.rapidapi.com',
                'x-rapidapi-key': 'dedd09657cmsh4940a42e41dfb4dp19ea58jsnded09a2d7adb'
            },
            method: 'GET',
            url,
        };
        let matches: any = [];
        return axios(options).then((res: any) => {
            // console.log("RESPONSE=========")
            // console.log(res['data']['results']);
            // res['data']['results'];
            for (let match of res['data']['results']) {
                const matchTitle =  match['home']['code'] && match['away']['code'] ?
                 `${match['home']['code']} V ${match['away']['code']}` :
                 `${match['home']['name'].substring(0,3)} V ${match['away']['name'].substring(0,3)}`
                 ;
                matches.push(
                    new LiveMatchDependency(matchTitle, match.match_title, match.match_subtitle, match.venue, match.status,
                        vscode.TreeItemCollapsibleState.None, {
                        command: 'extension.openMatch',
                        title: match.id,
                        arguments: [{seriesId: match.series_id, matchId: match.id}]
                    }
                    )
                );
            }
            return matches;
        }).catch((err: any) => {
            console.log("Error", err);
            matches = [];
            return matches;
        });
    }
}

export class LiveMatchDependency extends vscode.TreeItem {

    constructor(
        public readonly title: string,
        public readonly completeTitle: string,
        private readonly subtitle: string,
        private readonly venue: string,
        private readonly status: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command: vscode.Command
    ) {
        super(title, collapsibleState);
        //console.log(title.split('at')[0]);

        this.tooltip = `${this.completeTitle}-${this.subtitle}`;
        this.description = this.venue;
    }

    // iconPath = (this.status === 'Complete') ?
    //  new vscode.ThemeIcon(this.command.title.toString(), 'red') :
    //  new vscode.ThemeIcon(this.command.title.toString(), 'red')
    // ;
    iconPath = (this.status === 'Complete') ? {
        light: path.join(__filename, '..', '..', 'resources', 'small_red.svg'),
        dark: path.join(__filename, '..', '..', 'resources', 'small_red.svg')
    } : {
        light: path.join(__filename, '..', '..', 'resources', 'small_green.svg'),
        dark: path.join(__filename, '..', '..', 'resources', 'small_green.svg')
    };

    contextValue = 'LiveMatchDependency';
}

