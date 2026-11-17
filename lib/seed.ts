import 'server-only';
import { importCreators, defaultCampaign, type State } from './model';
import { shortlistCsv } from './shortlist-csv';

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
  const creators = importCreators(shortlistCsv, 'shortlist_summary.csv · 17 November 2026');
  for (const creator of creators) {
    const note = editorial[creator.handle];
    if (!note) continue;
    creator.rationale = note.rationale;
    if (note.story) creator.story = note.story;
  }
  return {
    campaign: {
      ...defaultCampaign,
      name: 'Three markets · Creator pilot',
      target: 'Polish-, Serbian- and Macedonian-speaking travellers with disrupted flights',
    },
    creators,
    snapshots: [],
  };
}
