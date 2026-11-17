import 'server-only';
import { seedCreatorRecords } from './catalog.ts';
import { ALL_MARKETS_HEADER, CreatorSchema, defaultCampaign, profileFromCatalog, type State } from './model';

const editorial: Record<string, { rationale: string; story?: string }> = {
  '@holiday.stop': {
    rationale: 'First pilot candidate: personal nine-hour Egypt flight-delay story and relevant travel content. Eligibility of the story is unverified.',
    story: 'Yes — nine-hour delay returning from Egypt (eligibility unverified).',
  },
  '@podroze_za_grosze': {
    rationale: 'Strong reported Polish audience concentration. Explore Instagram pricing; negotiate TikTok using comparable results.',
    story: 'Not stated',
  },
  '@travelovcy': {
    rationale: 'Relevant reported audience, but the current quote needs stronger evidence of acquisition performance.',
    story: 'Not stated',
  },
  '@kajetaneo': {
    rationale: 'Priority follow-up: the tracker describes unsolicited Wizz Air disruption content, directly relevant to Winglex.',
  },
  '@dalekojeszczetravel': {
    rationale: 'High historical median and a consumer-rights angle make this a useful follow-up.',
  },
  '@letsfly_pl': {
    rationale: 'Pilot expertise could support educational content. Confirm availability and any employer restrictions.',
  },
  '@swiatnaczterystopy': {
    rationale: 'Travel audience merits review; acquisition advantage is not yet established.',
  },
  '@owsianapl': {
    rationale: 'High listed engagement warrants investigation of audience and content relevance.',
  },
};

export function initialState(): State {
  const creators = seedCreatorRecords().map(record => CreatorSchema.parse({
    ...record,
    profiles: record.profiles.map(item => profileFromCatalog(item.platform, item.mapped)),
  }));
  for (const creator of creators) {
    const note = editorial[creator.handle];
    if (!note) continue;
    creator.rationale = note.rationale;
    if (note.story) creator.story = note.story;
  }
  return {
    campaign: {
      ...defaultCampaign,
      name: ALL_MARKETS_HEADER.name,
      target: ALL_MARKETS_HEADER.target,
    },
    creators,
    snapshots: [],
  };
}
