import { EnonicError, EnonicErrorKey, isBadRequestError } from "enonic-fp/lib/errors";
import { Response } from "enonic-types/lib/controller";
import { localize } from "enonic-fp/lib/i18n";
import { getOrElse } from 'fp-ts/lib/Option'
import { IO, io, map } from "fp-ts/lib/IO";
import {getUnsafeRenderer} from "enonic-fp/lib/thymeleaf";

export const defaultStatusNumbers: { [key in EnonicErrorKey]: number } = {
  "BadRequestError": 400,
  "UnauthorizedError": 401,
  "ForbiddenError": 403,
  "NotFoundError": 404,
  "MethodNotAllowedError": 405,
  "InternalServerError": 500,
  "BadGatewayError": 502,
  "PublishError": 500,
};

function contentType(body: any): string {
  return (typeof body === "string")
    ? 'text/html'
    : 'application/json';
}

export function status(statusOrError: number | EnonicError, body?: string | object): IO<Response> {
  const status = (typeof statusOrError == 'number')
    ? statusOrError
    : defaultStatusNumbers[statusOrError.errorKey];

  return io.of({
    status,
    body,
    contentType: contentType(body)
  })
}

/**
 * Creates a Json Response based on an EnonicError
 */
export function errorResponse(i18nPrefix: string, debug = false): (err: EnonicError) => IO<Response> {
  return (err: EnonicError): IO<Response> => {
    const i18nKey = `${i18nPrefix}.${err.errorKey}`;

    return status(err, {
      message: getOrElse(() => i18nKey)(localize({ key: i18nKey })),
      cause: debug && !isBadRequestError(err)
        ? err.cause
        : undefined,
      errors: isBadRequestError(err)
        ? err.errors
        : undefined
    });
  };
}

/**
 * Creates a Response based on a thymeleaf view, and an EnonicError
 */
export function renderErrorPage(view: any): (err: EnonicError) => IO<Response> {
  return (err: EnonicError): IO<Response> => status(err, getUnsafeRenderer<EnonicError>(view));
}

export const ok = (body: any): IO<Response> => status(200, body);

export const created = (body: any): IO<Response> => status(201, body);

export const noContent = (): IO<Response> => io.of<Response>({ status: 204, body: ''});

export const redirect = (redirect: string): IO<Response> => io.of<Response>({
  applyFilters: false,
  postProcess: false,
  redirect,
  status: 303,
  body: ''
});

export const badRequest = (body: any): IO<Response> => status(400, body);

export const unauthorized = (body: any): IO<Response> => status(401, body);

export const forbidden = (body: any): IO<Response> =>  status(403, body);

export const notFound = (body: any): IO<Response> =>  status(404, body);

export const methodNotAllowed = (body: any): IO<Response> =>  status(405, body);

export const internalServerError = (body: any): IO<Response> =>  status(500, body);

export const badGateway = (body: any): IO<Response> =>  status(502, body);

export function setTotal(total: number, response: IO<Response>): IO<Response> {
  return map((res: Response) => {
    return {
      ...res,
      headers: {
        ...res.headers,
        'X-Total-Count': String(total)
      }
    };
  })(response);
}
