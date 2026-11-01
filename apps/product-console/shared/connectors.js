/**
 * Future channel boundary. Internal Listing documents are NOT API publication payloads.
 * Implementations must fetch account/category/market requirements before compiling.
 * Shopify list reconciliation must compare the existing remote product before any write.
 *
 * @typedef {{platform:string,account:string,market:string,locale:string,category?:string}} ChannelContext
 * @typedef {{version:string,source:string,fetchedAt:string,rules:object}} ChannelRequirements
 * @typedef {{valid:boolean,issues:Array<object>,publicationValidated:boolean}} ChannelValidation
 */
export class PlatformConnector {
  constructor(platform) {
    this.platform = platform;
  }

  /** @param {ChannelContext} context @returns {Promise<ChannelRequirements>} */
  async getRequirements(context) { return this.unavailable(context); }

  /** @returns {Promise<ChannelValidation>} */
  async validate(draft, requirements) { return this.unavailable(draft, requirements); }

  /** Compile only after official validation; preserve the source Markdown separately. */
  async compile(draft, requirements) { return this.unavailable(draft, requirements); }

  /** Future implementation must explicitly identify a create versus a bounded update. */
  async submit(payload, { remoteId, idempotencyKey } = {}) { return this.unavailable(payload, remoteId, idempotencyKey); }

  async getStatus(remoteId) { return this.unavailable(remoteId); }

  unavailable() {
    const error = new Error('CONNECTOR_NOT_CONFIGURED');
    error.code = 'CONNECTOR_NOT_CONFIGURED';
    throw error;
  }
}

export const platformConnectors = Object.freeze(Object.fromEntries(
  ['amazon', 'shopify', 'tiktok'].map((platform) => [platform, new PlatformConnector(platform)]),
));
