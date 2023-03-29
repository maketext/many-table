function http(e) {
	function doit(method, url, param, callback) {
		axios[method](url, param, {
    }).then(function (res) {
			console.log("HTTP 응답 res.data=" + JSON.stringify(res.data))
			callback(res.data)
    }).catch((reason) => {
			callback(reason)
		})
	}
	
	doit(e.method, e.uri, e.param, e.cb)
}
