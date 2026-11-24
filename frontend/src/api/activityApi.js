import { getMyActivity as fetchMyActivity } from "../services/activityService";

export function getMyActivity(token) {
  return fetchMyActivity(token ? { token } : {});
}
