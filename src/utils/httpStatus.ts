export interface HttpStatus {
  code: number
  name: string
  meaning: string
  note: string
  common: boolean
}
export const httpStatusGroups = [
  { key: 1, title: '1xx 信息响应' }, { key: 2, title: '2xx 成功' },
  { key: 3, title: '3xx 重定向' }, { key: 4, title: '4xx 客户端错误' },
  { key: 5, title: '5xx 服务端错误' },
]
// IANA HTTP Status Code Registry, checked 2026-09-26. Local snapshot; no runtime requests.
export const httpStatusSource = 'https://www.iana.org/assignments/http-status-codes/'
const rows = `100|Continue|继续发送请求体|服务端已收到请求头，可继续发送正文。
101|Switching Protocols|切换协议|常见于协议升级，例如 WebSocket。
102|Processing|正在处理|WebDAV 的处理中响应。
103|Early Hints|提前提示|可通过 Link 头提前告知需要加载的资源。
104|Upload Resumption Supported|支持恢复上传|临时登记；当前注册到期日为 2026-11-13。
200|OK|请求成功|请求已成功处理，返回内容取决于请求方法。
201|Created|已创建资源|常见于创建接口，可用 Location 指向新资源。
202|Accepted|已接受处理|请求已接收，但不代表后台处理已经完成。
203|Non-Authoritative Information|非权威信息|返回内容经过转换代理修改。
204|No Content|成功，无响应内容|响应不包含正文，客户端不应尝试解析 JSON 正文。
205|Reset Content|重置内容|要求客户端重置提交请求的文档视图。
206|Partial Content|部分内容|Range 范围请求成功，常见于分段下载。
207|Multi-Status|多状态响应|WebDAV 使用响应体描述多个资源的处理结果。
208|Already Reported|已报告|WebDAV 中避免重复列举绑定资源。
226|IM Used|使用实例操作|响应是对资源进行实例操作后的结果。
300|Multiple Choices|存在多个选择|资源有多个可供选择的表示。
301|Moved Permanently|永久移动|资源已永久迁移；历史客户端可能把 POST 改为 GET。
302|Found|临时移动|临时转向其他地址；客户端可能把 POST 改为 GET。
303|See Other|查看其他资源|通常使用 GET 获取另一地址的结果，例如表单提交后跳转。
304|Not Modified|资源未修改|条件请求命中缓存，使用本地缓存；响应不含正文。
305|Use Proxy|使用代理|已弃用，不建议用于新接口。
306|(Unused)|未使用|保留代码，不用于普通业务响应。
307|Temporary Redirect|临时重定向|重定向时保留原请求方法和请求体。
308|Permanent Redirect|永久重定向|永久迁移，保留原请求方法和请求体。
400|Bad Request|请求有误|请求语法、格式或其他客户端输入存在问题。
401|Unauthorized|缺少有效身份凭据|检查登录凭据；响应通常包含 WWW-Authenticate。
402|Payment Required|需要付款|保留供未来使用；具体业务用法需要接口自行约定。
403|Forbidden|禁止访问|服务端理解请求但拒绝执行，与未登录的 401 不同。
404|Not Found|未找到资源|检查路径、资源标识；服务端也可能不愿透露资源是否存在。
405|Method Not Allowed|不允许该方法|检查 GET / POST 等方法及响应中的 Allow 头。
406|Not Acceptable|无法提供可接受的表示|检查 Accept 等内容协商请求头。
407|Proxy Authentication Required|需要代理认证|客户端需要向代理提供身份凭据。
408|Request Timeout|请求超时|服务端未能及时收齐客户端请求。
409|Conflict|资源状态冲突|例如并发版本冲突；解决冲突后再提交。
410|Gone|资源已移除|资源已不可用，通常意味着永久移除。
411|Length Required|需要内容长度|服务端要求请求中提供 Content-Length。
412|Precondition Failed|前置条件失败|If-Match 等条件未满足。
413|Content Too Large|请求内容过大|请求体超出服务端限制；旧名 Payload Too Large。
414|URI Too Long|URI 过长|URL 长度超过服务端可处理的范围。
415|Unsupported Media Type|不支持媒体类型|检查 Content-Type 与实际请求体格式。
416|Range Not Satisfiable|无法满足范围请求|请求范围超出资源长度或不可用。
417|Expectation Failed|无法满足期望|服务端无法满足 Expect 请求头。
418|(Unused)|未使用，保留代码|常见昵称 I'm a teapot（我是茶壶）；现行 HTTP 语义将其标为未使用。
421|Misdirected Request|请求发错目标|服务端无法为此目标 URI 提供权威响应。
422|Unprocessable Content|内容无法处理|语法和媒体类型可识别，但无法处理其指令；旧名 Unprocessable Entity。
423|Locked|资源被锁定|WebDAV 资源处于锁定状态。
424|Failed Dependency|依赖操作失败|请求依赖的其他操作未成功。
425|Too Early|请求过早|服务端不愿承担早期数据被重放的风险。
426|Upgrade Required|需要升级协议|服务端拒绝当前协议，要求升级后重试。
428|Precondition Required|需要前置条件|服务端要求使用条件请求，避免并发覆盖。
429|Too Many Requests|请求过于频繁|触发限流；留意 Retry-After，并按策略退避。
431|Request Header Fields Too Large|请求头过大|减少 Cookie 或其他过大的请求头。
451|Unavailable For Legal Reasons|因法律原因不可用|因法律要求无法访问该资源。
500|Internal Server Error|服务器内部错误|服务端遇到无法完成请求的意外情况。
501|Not Implemented|尚未实现|服务端不支持完成请求所需的功能。
502|Bad Gateway|网关响应无效|网关或代理收到无效的上游响应。
503|Service Unavailable|服务暂不可用|常见于维护或过载；留意 Retry-After。
504|Gateway Timeout|网关超时|网关或代理未及时收到上游响应。
505|HTTP Version Not Supported|不支持 HTTP 版本|服务端不支持请求所使用的 HTTP 主版本。
506|Variant Also Negotiates|协商配置错误|透明内容协商存在循环配置问题。
507|Insufficient Storage|存储空间不足|服务端无法存储完成请求所需的数据。
508|Loop Detected|检测到循环|处理 WebDAV 请求时检测到无限循环。
510|Not Extended|未扩展|已废弃的 HTTP 扩展框架状态码。
511|Network Authentication Required|需要网络认证|访问网络前需要认证，常见于门户登录。`
const common = new Set([100,101,200,201,202,204,206,301,302,303,304,307,308,400,401,403,404,405,408,409,413,415,422,429,500,502,503,504])
export const httpStatuses: HttpStatus[] = rows.split('\n').map(row => {
  const [code, name, meaning, note] = row.split('|')
  return { code: Number(code), name: name!, meaning: meaning!, note: note!, common: common.has(Number(code)) }
})
export function filterHttpStatuses(query: string, group: number, commonOnly: boolean): HttpStatus[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return httpStatuses.filter(status => (!group || Math.floor(status.code / 100) === group)
    && (!commonOnly || status.common)
    && words.every(word => `${status.code} ${status.name} ${status.meaning} ${status.note}`.toLowerCase().includes(word)))
}
