import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const defaultState = {
  meta: {
    panelMessageId: null,
    panelChannelId: null
  },
  lastConfessionId: 0,
  confessions: {}
};

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

export class DataStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.state = cloneDefaultState();
  }

  async init() {
    await mkdir(dirname(this.filePath), { recursive: true });

    try {
      const raw = await readFile(this.filePath, "utf8");
      this.state = { ...cloneDefaultState(), ...JSON.parse(raw) };
      this.state.meta = { ...defaultState.meta, ...(this.state.meta ?? {}) };
      this.state.confessions = this.state.confessions ?? {};
      for (const confession of Object.values(this.state.confessions)) {
        confession.publicChannelId ??= null;
        confession.publicMessageId ??= null;
        confession.commentThreadId ??= null;
        confession.votes ??= { up: [], down: [] };
        confession.votes.up ??= [];
        confession.votes.down ??= [];
        confession.comments ??= [];
        confession.reporters ??= [];
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }

      await this.#save();
    }

    return this;
  }

  async #save() {
    const tempFile = `${this.filePath}.tmp`;
    await writeFile(tempFile, JSON.stringify(this.state, null, 2), "utf8");
    await rename(tempFile, this.filePath);
  }

  getPanelState() {
    return { ...this.state.meta };
  }

  async setPanelMessage(channelId, messageId) {
    this.state.meta.panelChannelId = channelId;
    this.state.meta.panelMessageId = messageId;
    await this.#save();
  }

  async createConfession({ authorId, title, category, content }) {
    const id = this.state.lastConfessionId + 1;
    this.state.lastConfessionId = id;
    this.state.confessions[String(id)] = {
      id,
      authorId,
      title,
      category,
      content,
      createdAt: new Date().toISOString(),
      publicChannelId: null,
      publicMessageId: null,
      commentThreadId: null,
      votes: {
        up: [],
        down: []
      },
      comments: [],
      reporters: []
    };
    await this.#save();
    return { ...this.state.confessions[String(id)] };
  }

  getConfession(id) {
    const confession = this.state.confessions[String(id)];
    return confession ? JSON.parse(JSON.stringify(confession)) : null;
  }

  async removeConfession(id) {
    delete this.state.confessions[String(id)];
    await this.#save();
  }

  async attachPublicMessage(id, channelId, messageId) {
    const confession = this.state.confessions[String(id)];
    if (!confession) {
      return null;
    }

    confession.publicChannelId = channelId;
    confession.publicMessageId = messageId;
    await this.#save();
    return JSON.parse(JSON.stringify(confession));
  }

  async attachCommentThread(id, threadId) {
    const confession = this.state.confessions[String(id)];
    if (!confession) {
      return null;
    }

    confession.commentThreadId = threadId;
    await this.#save();
    return JSON.parse(JSON.stringify(confession));
  }

  async toggleVote(id, userId, direction) {
    const confession = this.state.confessions[String(id)];
    if (!confession) {
      return null;
    }

    const upVotes = new Set(confession.votes.up);
    const downVotes = new Set(confession.votes.down);

    if (direction === "up") {
      if (upVotes.has(userId)) {
        upVotes.delete(userId);
      } else {
        upVotes.add(userId);
        downVotes.delete(userId);
      }
    }

    if (direction === "down") {
      if (downVotes.has(userId)) {
        downVotes.delete(userId);
      } else {
        downVotes.add(userId);
        upVotes.delete(userId);
      }
    }

    confession.votes.up = [...upVotes];
    confession.votes.down = [...downVotes];
    await this.#save();
    return JSON.parse(JSON.stringify(confession));
  }

  async addComment(id, comment) {
    const confession = this.state.confessions[String(id)];
    if (!confession) {
      return null;
    }

    confession.comments.push({
      id: confession.comments.length + 1,
      ...comment,
      createdAt: new Date().toISOString()
    });
    await this.#save();
    return JSON.parse(JSON.stringify(confession));
  }

  async addReport(id, reporterId, reason) {
    const confession = this.state.confessions[String(id)];
    if (!confession) {
      return { confession: null, alreadyReported: false };
    }

    const hasAlreadyReported = confession.reporters.some((report) => report.reporterId === reporterId);

    if (hasAlreadyReported) {
      return {
        confession: JSON.parse(JSON.stringify(confession)),
        alreadyReported: true
      };
    }

    confession.reporters.push({
      reporterId,
      reason,
      createdAt: new Date().toISOString()
    });
    await this.#save();

    return {
      confession: JSON.parse(JSON.stringify(confession)),
      alreadyReported: false
    };
  }
}
