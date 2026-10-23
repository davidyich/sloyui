export function isDevelop(){return /^\/develop(?:\/|$)/.test(location.pathname);}
export function catalogAPI(path:string){return (isDevelop()?'/develop':'')+path;}
export function catalogLogin(){return '/api/admin/auth/login'+(isDevelop()?'?returnTo=develop':'');}
