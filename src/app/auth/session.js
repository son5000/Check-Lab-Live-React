export const CHECKLAB_AUTH_COOKIE_NAME = "checklab-auth-token";
export const CHECKLAB_AUTH_STORAGE_KEY = "checklab:auth-token";
export const CHECKLAB_SAMPLE_TOKEN = "checklab-dev-session";
export const CHECKLAB_SAMPLE_CREDENTIALS = {
    id: "dev",
    password: "123",
};
export function isValidCheckLabToken(token) {
    return token === CHECKLAB_SAMPLE_TOKEN;
}
