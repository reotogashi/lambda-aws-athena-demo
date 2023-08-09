import {
  buildQuery,
  getQueryResultFromAthena,
  showQueryResult,
} from './src/services/athena';

export const handler = async (event: any): Promise<string> => {
  try {
    const query = await buildQuery();
    const response = await getQueryResultFromAthena(query);
    await showQueryResult(response);
    return 'Succeeded';
  } catch (err) {
    console.error(JSON.stringify(err));
    return 'Failed';
  }
};
