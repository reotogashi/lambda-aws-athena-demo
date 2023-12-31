import {
  AthenaClient,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  StartQueryExecutionCommand,
  QueryExecutionState,
  GetQueryResultsCommandOutput,
} from '@aws-sdk/client-athena';

import {
  DATABASE_NAME,
  TABLE_NAME,
  S3_URL_FOR_OUTPUT_LOCATION,
  S3_URL_FOR_QUERY,
  QUERY_DATE,
} from '../constants';
const athena = new AthenaClient();

export const buildQuery = async (): Promise<string> => {
  // Update query if needed
  const query = `
  SELECT
    COUNT(DISTINCT user_id) AS total_new_users
  FROM
    "${TABLE_NAME}"
  WHERE
    "$PATH" = '${S3_URL_FOR_QUERY}'
    AND date_submission = CAST('${QUERY_DATE}' AS DATE)
    AND user_id NOT IN (
      SELECT
        DISTINCT user_id
      FROM
        "${TABLE_NAME}"
      WHERE
        "$PATH" = '${S3_URL_FOR_QUERY}'
        AND date_submission < CAST('${QUERY_DATE}' AS DATE)
    )
  LIMIT
    1;
  `;
  console.info(`query: ${JSON.stringify(query)}`);
  return query;
};

export const getQueryResultFromAthena = async (
  query: string,
): Promise<GetQueryResultsCommandOutput> => {
  const queryExecutionId = await executeQuery(query);
  await waitQueryResult(queryExecutionId);
  const response = getQueryResults(queryExecutionId);
  return response;
};

export const showQueryResult = async (
  response: GetQueryResultsCommandOutput,
) => {
  const label = response.ResultSet!.Rows![0].Data![0].VarCharValue;
  const value = response.ResultSet!.Rows![1].Data![0].VarCharValue;
  console.info(`label: ${label}`);
  console.info(`value: ${value}`);
};

const executeQuery = async (query: string): Promise<string> => {
  const { QueryExecutionId } = await athena.send(
    new StartQueryExecutionCommand({
      QueryString: query,
      QueryExecutionContext: {
        Database: DATABASE_NAME,
      },
      ResultConfiguration: {
        OutputLocation: S3_URL_FOR_OUTPUT_LOCATION,
      },
    }),
  );

  if (QueryExecutionId === undefined)
    throw new Error('QueryExecutionId is undefined.');

  return QueryExecutionId;
};

const waitQueryResult = async (queryExecutionId: string) => {
  // Poll the result until the execution finishs
  let queryExecutionState: QueryExecutionState = QueryExecutionState.RUNNING;
  while (queryExecutionState === QueryExecutionState.RUNNING) {
    console.info(`polling query execution...`);
    // wait for 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check quert execution status
    const { QueryExecution } = await athena.send(
      new GetQueryExecutionCommand({
        QueryExecutionId: queryExecutionId,
      }),
    );
    if (QueryExecution?.Status?.State === undefined) {
      throw new Error('QueryExecution is undefined.');
    }

    // Store query execution status
    queryExecutionState = QueryExecution.Status.State as QueryExecutionState;
  }

  if (queryExecutionState !== QueryExecutionState.SUCCEEDED) {
    throw new Error(
      `Query ${queryExecutionId} failed with status ${queryExecutionState}`,
    );
  }
};

const getQueryResults = async (
  queryExecutionId: string,
): Promise<GetQueryResultsCommandOutput> => {
  const response: GetQueryResultsCommandOutput = await athena.send(
    new GetQueryResultsCommand({
      QueryExecutionId: queryExecutionId,
    }),
  );

  if (response?.ResultSet?.Rows === undefined) {
    throw new Error('ResultSet is undefined.');
  }
  console.info(`response from Athena: ${JSON.stringify(response)}`);
  return response;
};
