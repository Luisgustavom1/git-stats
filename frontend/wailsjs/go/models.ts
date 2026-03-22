export namespace gitstats {
	
	export class DashboardMetrics {
	    totalCommits: number;
	    activeRepos: number;
	    avgPerWeek: number;
	
	    static createFrom(source: any = {}) {
	        return new DashboardMetrics(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalCommits = source["totalCommits"];
	        this.activeRepos = source["activeRepos"];
	        this.avgPerWeek = source["avgPerWeek"];
	    }
	}
	export class RecentCommit {
	    repo: string;
	    author: string;
	    message: string;
	    date: string;
	
	    static createFrom(source: any = {}) {
	        return new RecentCommit(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.repo = source["repo"];
	        this.author = source["author"];
	        this.message = source["message"];
	        this.date = source["date"];
	    }
	}
	export class WeeklyCommit {
	    week: string;
	    commits: number;
	
	    static createFrom(source: any = {}) {
	        return new WeeklyCommit(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.week = source["week"];
	        this.commits = source["commits"];
	    }
	}
	export class DashboardSnapshot {
	    metrics: DashboardMetrics;
	    weeklyCommits: WeeklyCommit[];
	    recentCommits: RecentCommit[];
	    windowDays: number;
	
	    static createFrom(source: any = {}) {
	        return new DashboardSnapshot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.metrics = this.convertValues(source["metrics"], DashboardMetrics);
	        this.weeklyCommits = this.convertValues(source["weeklyCommits"], WeeklyCommit);
	        this.recentCommits = this.convertValues(source["recentCommits"], RecentCommit);
	        this.windowDays = source["windowDays"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	

}

