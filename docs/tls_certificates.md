# HTTPS/SSL/TLS Certificates

When the target site is a HTTPS site, requests would normally validate the certificate since the web browser does this. This plugin used to do that too, until version 3.2.3. Due to the high ratio of support cases received involving issues with corporate certificates and self-signed certificates, it was decided to follow the same path as Cypress itself - allow invalid certificates, by default. Since Cypress is a testing platform, one can follow the reasoning that this takes the pressure of the testers to have full certificates also in the test environment. At the same time, this makes the test runs open to MITM attacks. To aim for higher security standards, the plugin will log warnings to the console when certificate validations fail. There is also a `strict` mode available to enforce valid certificates.

## HTTPS_VALIDATION

The plugins behavior for HTTPS validation can be configured using the environment variable `HTTPS_VALIDATION`. The following values are supported:
- `unsafe` : No validations are performed at all. This is the same behavior as Cypress has when run without this plugin.
- `warn` : Default mode. Allows invalid certificates, but validates certificates and logs warnings about invalid certificates to the console.
- `strict` : Secure mode, this is the old (<= 3.2.3) behavior of this plugin. If validation fails, the socket to Cypress is terminated, resulting in a network error in Cypress. This will generally break the test.

If `HTTPS_VALIDATION` is unset, or set to any other value, it will fall-back to `warn` mode.

### Self-signed certificates accepted from localhost

In `warn` mode, the validation will accept self-signed certificates for sites that are served from localhost. This is convenient for testing local development builds without requiring a full CA chain for the certificates, while still requiring proper certificates from external servers.

### NODE_TLS_REJECT_UNAUTHORIZED

The environment variable `NODE_TLS_REJECT_UNAUTHORIZED` is supported by Node to disable certificate validation for the whole Node process. This variable is honoured by the plugin. If it is set to "0", it overrides and HTTPS_VALIDATION setting and forces the validation to `unsafe` mode. This is also logged as a warning to the console.

## Troubleshooting HTTPS/SSL/TLS issues

To aim for higher security standards, it is recommended to review certificate validation warnings and fix them. Getting certificates right can be a burden, but since they are only warnings they can be dealt with when time permits. When all warnings have been fixed, you can set HTTPS_VALIDATION to `strict` and pat yourself on the back!

### Corporate CA certificates

Many corporate intranets utilize SSL inspection, which means that your HTTPS traffic is decrypted, inspected, and then encrypted with an internal corporate certificate. Since Node doesn't trust the corporate certificates CA, it will raise an error. Download the certificate to your machine and set the environment variable `NODE_EXTRA_CA_CERTS` to the full path to the certificate file. This will make Node trust it as a CA.

For a detailed walktrough of how to deal with corporate CA certs, please see my session from NDC Oslo 2020 - [E2E testing goes corporate](https://youtu.be/gpT8uieBqX0)
