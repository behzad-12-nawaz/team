module.exports = (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const path = url.pathname

  if (path === "/") {
    res.statusCode = 200
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({ hello: "dosecare-bot" }))
    return
  }

  if (path === "/send") {
    if (req.method === "GET" || req.method === "POST") {
      res.statusCode = 200
      res.setHeader("content-type", "application/json")
      res.end(JSON.stringify({ sent: true }))
      return
    }
  }

  res.statusCode = 404
  res.setHeader("content-type", "application/json")
  res.end(JSON.stringify({ detail: "Not found" }))
}
