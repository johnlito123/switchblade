const { GuildPlayer, Song, Playlist } = require('./structures')

const { PlayerManager } = require('discord.js-lavalink')
const snekfetch = require('snekfetch')

const DEFAULT_JOIN_OPTIONS = { selfdeaf: true }
const SEARCH_PREFIXES = ['scsearch:', 'ytsearch:']

module.exports = class SwitchbladePlayerManager extends PlayerManager {
  constructor (client, nodes = [], options = {}) {
    options.player = GuildPlayer
    super(client, nodes, options)

    this.REST_ADDRESS = `${process.env.LAVALINK_REST_HOST}:${process.env.LAVALINK_REST_PORT}`
  }

  onMessage (message) {
    if (!message || !message.op) return
    const player = this.get(message.guildId)
    if (!player) return
    return player.event(message)
  }

  async fetchTracks (identifier) {
    const res = await snekfetch.get(`http://${this.REST_ADDRESS}/loadtracks`)
      .query({ identifier })
      .set('Authorization', process.env.LAVALINK_PASSWORD)
      .catch(err => {
        console.error('fetchTracks error')
        console.error(err)
        return null
      })
    if (!res || !res.body || !res.body.length) return []
    const songs = res.body
    songs.searchResult = !!SEARCH_PREFIXES.find(p => identifier.startsWith(p))
    return songs
  }

  async loadTracks (identifier, requestedBy) {
    const songs = await this.fetchTracks(identifier)
    if (songs.length > 0) {
      if (songs.searchResult || songs.length === 1) {
        return new Song(songs[0], requestedBy)
      } else {
        return new Playlist(songs, requestedBy)
      }
    }
    return null
  }

  async play (song, channel) {
    if (song && song instanceof Song) {
      const host = this.nodes.first().host
      const player = await this.join({
        guild: channel.guild.id,
        channel: channel.id,
        host
      }, DEFAULT_JOIN_OPTIONS)

      player.play(song)
      return song
    }
    return null
  }
}
