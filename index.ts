import { buildQuery, getQueryResultFromAthena } from './src/services/athena';

export const handler = async (event: any): Promise<string> => {
  try {
    const query = await buildQuery();
    const resultSet = await getQueryResultFromAthena(query);
    return 'Succeeded';
  } catch (err) {
    console.log(JSON.stringify(err));
    return 'Failed';
  }
};