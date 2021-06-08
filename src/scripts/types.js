/**
 * @typedef {Object} FlickgameDataScene
 * @property {string} image
 * @property {{[index: string]: string}} jumps
 */

/**
 * @typedef {Object} FlickgameDataProject
 * @property {FlickgameDataScene[]} scenes
 */

/**
 * @typedef {Object} ResourceData
 * @property {string} type
 * @property {any} data
 */

/**
 * @template T
 * @typedef {Object} ProjectBundle
 * @property {T} project
 * @property {{[id: string]: ResourceData}} resources
 */
