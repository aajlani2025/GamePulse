let _accessToken = null;
let _refreshHandler = null;
let _logoutHandler = null;

function getAccessToken() {
  return _accessToken;
}

function setAccessToken(token) {
  _accessToken = token;
}

function setRefreshHandler(fn) {
  _refreshHandler = fn;
}

function callRefresh() {
  if (typeof _refreshHandler === "function") return _refreshHandler();
  return Promise.resolve(false);
}

function setLogoutHandler(fn) {
  _logoutHandler = fn;
}

function callLogout() {
  if (typeof _logoutHandler === "function") return _logoutHandler();
  return Promise.resolve();
}

// Clear any local data the app stores (alerts, groups , levels )
function clearLocalData() {
  try {
    localStorage.removeItem("gp_alerts");
    localStorage.removeItem("ncaa_groups");
    localStorage.removeItem("ncaa_levels");
  } catch (e) {}
}

module.exports = {
  getAccessToken,
  setAccessToken,
  setRefreshHandler,
  callRefresh,
  setLogoutHandler,
  callLogout,
  clearLocalData,
};
