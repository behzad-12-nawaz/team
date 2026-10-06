module.exports = (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const path = url.pathname

  if (path === "/" || path === "/health") {
    const body = path === "/health"
      ? { status: "ok" }
      : { hello: "dosecare-api" }
    res.statusCode = 200
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify(body))
    return
  }

  res.statusCode = 404
  res.setHeader("content-type", "application/json")
  res.end(JSON.stringify({ detail: "Not found" }))
}
