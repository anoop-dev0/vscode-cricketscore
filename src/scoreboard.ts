import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
const axios = require("axios");
const moment = require('moment');

export class ScoreBoardProvider implements vscode.TreeDataProvider<Dependency> {

    private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | void> = new vscode.EventEmitter<Dependency | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private workspaceRoot: any) {

    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: Dependency): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: Dependency): Promise<Dependency[]> {
        console.log("ELEMENT======", element);
        if(element){
            let matches = await this.getDepsInPackageJson('scorecboard', element);
            return Promise.resolve(matches);
        } else {
            let matches = await this.getDepsInPackageJson('overview', '');
            return Promise.resolve(matches);
        }
        //console.log("MATCHES", matches);
    }

    /**
     * Given the path to package.json, read all its dependencies and devDependencies.
     */
    private getDepsInPackageJson(details: string, element: any): Dependency[] {
        const url = `https://cricket-live-data.p.rapidapi.com/match/${this.workspaceRoot?.matchId}`;
        const options ={
            method: 'GET',
            url,
            headers: {
              'x-rapidapi-host': 'cricket-live-data.p.rapidapi.com',
              'x-rapidapi-key': 'dedd09657cmsh4940a42e41dfb4dp19ea58jsnded09a2d7adb'
            }
          };
        const matches: any = [];
        return axios(options).then((res: any) => {
            
            let matchDetails = res['data']['results']['fixture'];
            let liveDetails = res['data']['results']['live_details'];

                if(details === 'overview'){
                    matches.push(
                        new Dependency(matchDetails['series']['series_name'], matchDetails['series']['season'], 
                                '',
                                vscode.TreeItemCollapsibleState.None, {
                                command: 'extension.openMatch',
                                title: matchDetails.id,
                                arguments: [{seriesId: matchDetails.series_id, matchId: matchDetails.id}]
                            }
                        )
                    );
                    matches.push(
                        new Dependency(liveDetails['match_summary']['home_scores'], matchDetails['home']['name'],
                                '',
                                vscode.TreeItemCollapsibleState.Collapsed, {
                                command: 'extension.openMatch',
                                title: matchDetails.id,
                                arguments: [{seriesId: matchDetails.series_id, matchId: matchDetails.id}]
                            }
                        )
                    );
                    matches.push(
                        new Dependency(liveDetails['match_summary']['away_scores'], matchDetails['away']['name'], 
                                '',
                                vscode.TreeItemCollapsibleState.Collapsed, {
                                command: 'extension.openMatch',
                                title: matchDetails.id,
                                arguments: [{seriesId: matchDetails.series_id, matchId: matchDetails.id}]
                            }
                        )
                    );
                }
                else {
                    const scorecard = liveDetails['scorecard'];
                    let teamCard = scorecard.filter( (inning: any) => {
                        console.log("inning = ", inning, "element", element);
                        if(inning.title.split(" Innings")[0] === element.subtitle) {
                            return true;
                        }
                    });
                    console.log("TEAMCARD++", teamCard);
                    if(teamCard){
                        teamCard = teamCard[0];
                        teamCard.batting.forEach( (battingOrder: any) => {
                            matches.push(
                                new Dependency(
                                    battingOrder['how_out'] === 'not out' ?
                                    `${battingOrder['player_name']} - ${battingOrder['runs']}*`: 
                                    `${battingOrder['player_name']} - ${battingOrder['runs']}`,
                                    `(${battingOrder['balls']})`, 
                                    `SR -${battingOrder['strike_rate']}, 4's x ${battingOrder['sixes']}, 6's x ${battingOrder['sixes']})`,
                                    vscode.TreeItemCollapsibleState.None,
                                    {
                                        command: 'extension.openMatch',
                                        title: battingOrder.bat_order,
                                        arguments: [{seriesId: matchDetails.series_id, matchId: matchDetails.id, playerId: battingOrder.player_id }]
                                    }
                                )
                            );
                        });
                        matches.push(
                            new Dependency(
                                `${teamCard.title} - ${teamCard.runs}/${teamCard.wickets}`,
                                `(${teamCard.overs})`, 
                                `run rate - ${teamCard.runs/teamCard.overs}`,
                                vscode.TreeItemCollapsibleState.None,
                                {
                                    command: '',
                                    title: `${teamCard.title}`,
                                    arguments: [{seriesId: matchDetails.series_id, matchId: matchDetails.id}]
                                }
                            )
                        );

                        teamCard.bowling.forEach( (bowlingOrder: any) => {
                            matches.push(
                                new Dependency( 
                                    `${bowlingOrder['player_name']} - ${bowlingOrder['runs_conceded']}/${bowlingOrder['wickets']}`,
                                    `(${bowlingOrder['overs']})`, 
                                    `economy - ${bowlingOrder['economy']}, maidens - ${bowlingOrder['maidens']}`,
                                    vscode.TreeItemCollapsibleState.None,
                                    {
                                        command: 'extension.openMatch',
                                        title: bowlingOrder.player_id,
                                        arguments: [{seriesId: matchDetails.series_id, matchId: matchDetails.id, playerId: bowlingOrder.player_id}]
                                    }
                                )
                            );
                        });
                        matches.push(
                            new Dependency(
                                `Extras - ${teamCard.extras}`,
                                `(${teamCard.extras_detail})`, 
                                ``,
                                vscode.TreeItemCollapsibleState.None,
                                {
                                    command: '',
                                    title: `${teamCard.title}`,
                                    arguments: [{seriesId: matchDetails.series_id, matchId: matchDetails.id}]
                                }
                            )
                        );
                       
                    }
                }
            const matchSummary = liveDetails['match_summary'];
            matches.push(
                new Dependency(
                    `${matchSummary['status']}`,
                    ``, 
                    `${matchSummary['status']}`,
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: '',
                        title: `${matchSummary['result']}`,
                        arguments: [{seriesId: matchDetails.series_id, matchId: matchDetails.id}]
                    }
                )
            );
            matches.push(
                new Dependency(
                    `Go Back To List`,
                    ``, 
                    ``,
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'liveMatches',
                        title: ``,
                        arguments: []
                    }
                )
            );
                
            return matches;
        }).catch((err: any) => {
            console.log("Error", err);
            return matches;
        });
    }
}

export class Dependency extends vscode.TreeItem {

    constructor(
        public readonly title: string,
        //public readonly completeTitle: string,
        private readonly subtitle: string,
        private readonly figure: string,
        // private readonly status: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command: vscode.Command
    ) {
        super(title, collapsibleState);
        //console.log(title.split('at')[0]);

        this.tooltip = figure !== '' ? figure : `${this.title}-${this.subtitle}`;
        this.description = this.subtitle;
    }

    // iconPath = (this.status === 'Complete') ?
    //  new vscode.ThemeIcon(this.command.title.toString(), 'red') :
    //  new vscode.ThemeIcon(this.command.title.toString(), 'red')
    // ;
    iconPath = {
        light: path.join(__filename, '..', '..', 'resources', ''),
        dark: path.join(__filename, '..', '..', 'resources', '')
    };
    // (this.status === 'Complete') ? {
    //     light: path.join(__filename, '..', '..', 'resources', 'small_red.svg'),
    //     dark: path.join(__filename, '..', '..', 'resources', 'small_red.svg')
    // } : {
    //     light: path.join(__filename, '..', '..', 'resources', 'small_green.svg'),
    //     dark: path.join(__filename, '..', '..', 'resources', 'small_green.svg')
    // };

    contextValue = 'dependency';
}

