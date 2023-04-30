package main

import (
	"crypto/tls"
	"log"
	"net/http"
)

// LoggingHandler is a custom http.Handler that logs requests and delegates them to the underlying handler.
type LoggingHandler struct {
	handler http.Handler
}

func (lh *LoggingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log.Printf("Serving file: %s", r.URL.Path)
	lh.handler.ServeHTTP(w, r)
}

func main() {
	dir := "./"
	addr := ":8000"

	// Configure TLS with the self-signed certificate and private key
	tlsConfig := &tls.Config{
		MinVersion:               tls.VersionTLS12,
		PreferServerCipherSuites: true,
		InsecureSkipVerify:       true,
		Certificates:             make([]tls.Certificate, 1),
	}

	// Load the certificate and private key
	cert, err := tls.LoadX509KeyPair("cert.pem", "key.pem")
	if err != nil {
		log.Fatalf("Failed to load certificate and key: %v", err)
	}
	tlsConfig.Certificates[0] = cert

	// Configure the HTTP/2 server
	server := &http.Server{
		Addr:      addr,
		Handler:   &LoggingHandler{http.FileServer(http.Dir(dir))},
		TLSConfig: tlsConfig,
	}

	log.Printf("Serving %s on %s using HTTP/2...", dir, addr)

	// Start the server
	if err := server.ListenAndServeTLS("", ""); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
