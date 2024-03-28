# zk-mastermind-webapp

The repository includes the front-end code of the Mastermind Dapp. 

### Folder Structure

```sh
├── public
└── src
```

* **public:** Here lies the proof key and circuits needed to run the application.
* **src:** Here lies the components, hooks and pages of the application.

### Install dependencies

To run the program we recommend to execute the last stable version of `nodejs` and `yarn`. Then, to install the dependencies of the project run the following command:

```sh
yarn install
```
 
### Run the Dapp in development mode

```sh
yarn dev
```

Once the command is executed a instance of the application will be executed.

### Build the Dapp

```sh
yarn build
```

### Appendix: Dapp repositories

The relevant repositories of the mastermind Dapp are as follows: 

1. [zk-mastermind-webdapp:](https://github.com/Modulo-P/zk-mastermind-webapp) Frontend application of the Mastermind Dapp.
2. [zk-mastermind-backend:](https://github.com/Modulo-P/zk-mastermind-backend) Backend application of the Mastermind Dapp.
3. [zk-mastermind-backend-onchain:](https://github.com/Modulo-P/zk-mastermind-backend-onchain) Hada mint contrat of the Mastermind Dapp.
4. [zk-mastermind-docker:](https://github.com/Modulo-P/zk-mastermind-docker) Docker container with the Kupo, Hydra and Cardano node components of the Dapp.
5. [zk-mastermind-circom:](https://github.com/Modulo-P/zk-mastermind-circom) Circom circuits of the mastermind Dapp.
6. [zk-mastermind-plutus:](https://github.com/Modulo-P/zk-mastermind-plutus) PlutusTx validator that implements the logic of the game.
7. [zk-mastermind-aiken:](https://github.com/Modulo-P/zk-mastermind-aiken) Aiken validator that implements the logic of the game.

