const fs = require('fs');
const { Octokit } = require('octokit');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

class Insights {
  constructor() {
    const {
      GITHUB_REPOSITORY,
      GITHUB_WORKSPACE,
      REPOSITORY_NAME,
      TRAFFIC_ACTION_TOKEN,
    } = process.env;

    this.repoName = REPOSITORY_NAME || GITHUB_REPOSITORY;
    this.path = `${GITHUB_WORKSPACE}/insights.csv`;

    this.stats = {};

    this.csvWriter = createObjectCsvWriter({
      path: this.path,
      header: [
        { id: 'date', title: 'date' },
        { id: 'totalClones', title: 'totalClones' },
        { id: 'uniqueClones', title: 'uniqueClones' },
        { id: 'totalViews', title: 'totalViews' },
        { id: 'uniqueViews', title: 'uniqueViews' },
      ],
    });

    this.octokit = new Octokit({
      auth: TRAFFIC_ACTION_TOKEN,
    });

    this.writeToCsv();
  }

  async readFromCsv() {
    try {
      if (!fs.existsSync(this.path)) return;

      fs.createReadStream(this.path)
        .pipe(csv())
        .on('data', (row) => this.stats[row.date] = row)
        .on('end', () => console.log('CSV successfully processed!', this.stats));
    } catch (e) {
      console.log('Failed to read from CSV', e);
    }
  }

  async writeToCsv() {
    try {
      await this.readFromCsv();
      await this.getClones();
      await this.getViews();
      await this.csvWriter.writeRecords(Object.values(this.stats))

      console.log('CSV successfully written!', this.stats);
    } catch (e) {
      console.log('Failed to write to CSV', e);
    }
  }

  async getClones() {
    try {
      const response = await this.octokit.request(`GET /repos/${this.repoName}/traffic/clones`);

      const clones = response.data.clones;

      clones.forEach(({timestamp, count, uniques }) => {
        const dateString = new Date(timestamp).toLocaleDateString();
        const {
          totalClones,
          uniqueClones,
        } = this.stats[dateString] || {};

        this.stats[dateString] = {
          ...this.stats[dateString],
          date: dateString,
          totalClones: totalClones || count,
          uniqueClones: uniqueClones || uniques,
        };
      });
    } catch (e) {
      console.log('Failed to fetch clone traffic', e);
    }
  }

  async getViews() {
    try {
      const response = await this.octokit.request(`GET /repos/${this.repoName}/traffic/views`);

      const views = response.data.views;

      views.forEach(({ timestamp, count, uniques }) => {
        const dateString = new Date(timestamp).toLocaleDateString();
        const {
          totalViews,
          uniqueViews,
        } = this.stats[dateString] || {};

        this.stats[dateString] = {
          ...this.stats[dateString],
          date: dateString,
          totalViews: totalViews || count,
          uniqueViews: uniqueViews || uniques,
        };
      });
    } catch (e) {
      console.log('Failed to fetch view traffic', e);
    }
  }
}

new Insights();