/**
 * See: https://github.com/deeplay-io/nice-grpc/tree/master/packages/nice-grpc#example-error-handling
 */
import { Status, ServerError, ServerMiddlewareCall, CallContext } from 'nice-grpc';

export async function* errorHandlingMiddleware<Request, Response>(
  call: ServerMiddlewareCall<Request, Response>,
  context: CallContext,
) {
  try {
    return yield* call.next(call.request, context);
  } catch (error) {
    if (error instanceof ServerError) {
      throw error;
    } else {
      throw new ServerError(Status.UNKNOWN, error.message);
    }
  }
}
