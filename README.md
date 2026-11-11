

- decrypt the `Simulation/Workflow/Init/full_config.enc` with the script `Simulation/Workflow/Init/encrypt_decrypt.py` with the password i gave u
- run `Simulation/Workflow/Init/check.py` to read the content of the `full_config.json`
- run npm install in `Simulation/Workflow/Funding` and fill `.env` in there like `.env.example`
- have a look at `Simulation/Workflow/Funding/fund.ts` That successfully funds an account by knowing its private key (an address is enough, but since we're storing the private keys anyways, we convert them to addresses)

