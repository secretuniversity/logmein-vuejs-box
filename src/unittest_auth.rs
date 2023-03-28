#[cfg(test)]
mod tests {
    use crate::contract::{PRNG_SEED_KEY, generate_keypair, instantiate, execute};
    use crate::msg::{ExecuteMsg, InstantiateMsg};
    use crate::state::{may_load, PREFIX_PUB_META, load, PREFIX_MAP_TO_INDEX, PREFIX_PRIV_META, PREFIX_INFOS, json_load};
    use crate::token::{Metadata, Extension, Token};
    use cosmwasm_std::{testing::*, Api, to_binary, BlockInfo, MessageInfo, Timestamp};
    use cosmwasm_storage::ReadonlyPrefixedStorage;
    use secret_toolkit::crypto::sha_256;
    use cosmwasm_std::{OwnedDeps, Addr, Response, StdResult,  Env};
    // Helper functions

    fn init_helper_default() -> (
        StdResult<Response>,
        OwnedDeps<MockStorage, MockApi, MockQuerier>,
        Env
    ) {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let env_copy = mock_env();
        let info = mock_info("instantiator", &[]);

        let init_msg = InstantiateMsg {
            name: "sec721".to_string(),
            symbol: "S721".to_string(),
            admin: Some(Addr::unchecked("admin").to_string()),
            entropy: "We're going to need a bigger boat".to_string(),
            royalty_info: None,
            config: None,
            post_init_callback: None,
        };

        (instantiate(deps.as_mut(), env, info, init_msg), deps, env_copy)
    }

    #[test]
    fn test_keygen_helpers() {
        let (init_result, deps, env) = init_helper_default();
        assert!(
            init_result.is_ok(),
            "Init failed: {}",
            init_result.err().unwrap()
        );

        // Test entropy init.
        let saved_prng_seed: Vec<u8> = may_load(deps.as_ref().storage, PRNG_SEED_KEY).unwrap().unwrap();
        let expected_prng_seed: Vec<u8> = sha_256(base64::encode("We're going to need a bigger boat".to_string()).as_bytes()).to_vec();
        assert_eq!(saved_prng_seed, expected_prng_seed);

        // Test adding key to metadata

        let meta = Metadata {
            token_uri: None,
            extension: Some(Extension {
                name: Some("MyNFT".to_string()),
                description: None,
                image: Some("uri".to_string()),
                ..Extension::default()
            }),
        };

        let info = mock_info("instantiator", &[]);
        let pair = generate_keypair(&env, &info.sender, saved_prng_seed, None);

        let key_meta = meta.add_auth_key(pair.0.as_bytes()).unwrap();

        let key_meta_expect = Metadata {
            token_uri: None,
            extension: Some(Extension {
                name: Some("MyNFT".to_string()),
                description: None,
                image: Some("uri".to_string()),
                auth_key: Some(pair.0.as_bytes().clone()),
                ..Extension::default()
            }),
        };

        assert_eq!(key_meta, key_meta_expect);
    }

    #[test]
    fn test_regenerate_keys() {
        let (init_result, mut deps, _env) = init_helper_default();
        assert!(
            init_result.is_ok(),
            "Init failed: {}",
            init_result.err().unwrap()
        );

        let pub_meta = Some(Metadata {
            token_uri: None,
            extension: Some(Extension {
                name: Some("MyNFT".to_string()),
                description: None,
                image: Some("uri".to_string()),
                ..Extension::default()
            }),
        });
        let priv_meta = Some(Metadata {
            token_uri: None,
            extension: Some(Extension {
                name: Some("MyNFTpriv".to_string()),
                description: Some("Nifty".to_string()),
                image: Some("privuri".to_string()),
                ..Extension::default()
            }),
        });

        let execute_msg = ExecuteMsg::MintNft {
            token_id: Some("MyNFT".to_string()),
            owner: Some(Addr::unchecked("alice").to_string()),
            public_metadata: pub_meta.clone(),
            private_metadata: priv_meta.clone(),
            royalty_info: None,
            serial_number: None,
            transferable: None,
            memo: Some("Mint it baby!".to_string()),
            padding: None,
        };

        let pub_expect1 = Some(Metadata {
            token_uri: None,
            extension: Some(Extension {
                name: Some("MyNFT".to_string()),
                description: None,
                image: Some("uri".to_string()),
                auth_key: None,
                ..Extension::default()
            }),
        });
        let priv_expect1 = Some(Metadata {
            token_uri: None,
            extension: Some(Extension {
                name: Some("MyNFTpriv".to_string()),
                description: Some("Nifty".to_string()),
                image: Some("privuri".to_string()),
                auth_key: None,
                ..Extension::default()
            }),
        });

        // Test key regeneration

        let _execute_result = execute(deps.as_mut(), mock_env(), mock_info("admin", &[]), execute_msg);

        let map2idx = Some(ReadonlyPrefixedStorage::new(&deps.storage, PREFIX_MAP_TO_INDEX));
        let index1: u32 = load(&map2idx.unwrap(), "MyNFT".as_bytes()).unwrap();
        let token_key1 = index1.to_le_bytes();
        let pub_store = Some(ReadonlyPrefixedStorage::new(&deps.storage, PREFIX_PUB_META));
        let pub_meta1: Metadata = load(&pub_store.unwrap(), &token_key1).unwrap();
        assert_eq!(pub_meta1, pub_expect1.unwrap());
        let priv_store = Some(ReadonlyPrefixedStorage::new(&deps.storage, PREFIX_PRIV_META));
        let priv_meta1: Metadata = load(&priv_store.unwrap(), &token_key1).unwrap();
        assert_eq!(priv_meta1, priv_expect1.unwrap());

        // Test key regeneration (by admin)
        let regenerate_keys_msg = ExecuteMsg::GenerateKeypairs {
            token_id: "MyNFT".to_string(),
            entropy: Some("randomstring".to_string()),
        };

        let pub_expect2 = Some(Metadata {
            token_uri: None,
            extension: Some(Extension {
                name: Some("MyNFT".to_string()),
                description: None,
                image: Some("uri".to_string()),
                auth_key: Some([76, 75, 133, 204, 122, 41, 35, 234, 115, 161, 72, 35, 49, 18, 200, 177, 177, 40, 178, 49, 210, 37, 86, 243, 252, 119, 204, 167, 62, 240, 126, 104]),
                ..Extension::default()
            }),
        });
        let priv_expect2 = Some(Metadata {
            token_uri: None,
            extension: Some(Extension {
                name: Some("MyNFTpriv".to_string()),
                description: Some("Nifty".to_string()),
                image: Some("privuri".to_string()),
                auth_key: Some([157, 120, 181, 79, 58, 94, 161, 100, 224, 137, 3, 54, 35, 195, 99, 76, 37, 96, 89, 96, 251, 114, 146, 37, 56, 4, 148, 199, 181, 64, 126, 228]),
                ..Extension::default()
            }),
        });

        let execute_result = execute(deps.as_mut(), mock_env(), mock_info("admin", &[]), regenerate_keys_msg);
        match execute_result {
            Ok(_hr) => {},
            Err(_e) => {panic!("Key regeneration by admin failed.")}
        }

        let map2idx = Some(ReadonlyPrefixedStorage::new(&deps.storage, PREFIX_MAP_TO_INDEX));

        let index1: u32 = load(&map2idx.unwrap(), "MyNFT".as_bytes()).unwrap();
        let token_key1 = index1.to_le_bytes();
        let pub_store = ReadonlyPrefixedStorage::new(&deps.storage, PREFIX_PUB_META);
        let pub_meta2: Metadata = load(&pub_store, &token_key1).unwrap();
        assert_eq!(pub_meta2, pub_expect2.unwrap());
        let priv_store = ReadonlyPrefixedStorage::new(&deps.storage, PREFIX_PRIV_META);
        let priv_meta2: Metadata = load(&priv_store, &token_key1).unwrap();
        assert_eq!(priv_meta2, priv_expect2.unwrap());

        // also test key regeneration by owner

        let regenerate_keys_msg2 = ExecuteMsg::GenerateKeypairs {
            token_id: "MyNFT".to_string(),
            entropy: Some("randomstring2".to_string()),
        };

        let execute_result = execute(deps.as_mut(), mock_env(), mock_info("alice", &[]), regenerate_keys_msg2);
        match execute_result {
            Ok(_hr) => {},
            Err(_e) => {panic!("Key regeneration by owner failed.")}
        }

    }

    #[test]
    fn test_send() {
        // test if the authentication keys are updated after the NFT is transferred and/or sent.
        // the tests are not complete as I didn't test every send/transfer and batch transfer messages.
        // but most of these unwritten tests overlap with unittest_handles anyway.
        let (init_result, mut deps, _env) = init_helper_default();
        assert!(
            init_result.is_ok(),
            "Init failed: {}",
            init_result.err().unwrap()
        );

        let david_raw = deps
        .api
        .addr_canonicalize(&Addr::unchecked("david").to_string())
        .unwrap();

        let pub_meta = Some(Metadata {
            token_uri: None,
            extension: Some(Extension {
                name: Some("MyNFT".to_string()),
                description: None,
                image: Some("uri".to_string()),
                ..Extension::default()
            }),
        });
        let priv_meta = Some(Metadata {
            token_uri: None,
            extension: Some(Extension {
                name: Some("MyNFTpriv".to_string()),
                description: Some("Nifty".to_string()),
                image: Some("privuri".to_string()),
                ..Extension::default()
            }),
        });

        let execute_msg = ExecuteMsg::MintNft {
            token_id: Some("MyNFT".to_string()),
            owner: Some(Addr::unchecked("alice").to_string()),
            public_metadata: pub_meta.clone(),
            private_metadata: priv_meta.clone(),
            royalty_info: None,
            serial_number: None,
            transferable: None,
            memo: Some("Mint it baby!".to_string()),
            padding: None,
        };

        let _execute_result = execute(deps.as_mut(), mock_env(), mock_info("admin", &[]), execute_msg);

        let map2idx = Some(ReadonlyPrefixedStorage::new(&deps.storage, PREFIX_MAP_TO_INDEX));

        let index1: u32 = load(&map2idx.unwrap(), "MyNFT".as_bytes()).unwrap();
        let token_key1 = index1.to_le_bytes();

        //  record the metadata of the NFT before sending it.

        let info_store = ReadonlyPrefixedStorage::new(&deps.storage, PREFIX_INFOS);
        let token: Token = json_load(&info_store, &token_key1).unwrap();

        let pub_store = ReadonlyPrefixedStorage::new(&deps.storage, PREFIX_PUB_META);
        let pub_meta: Metadata = may_load(&pub_store, &token_key1).unwrap().unwrap();
        let pub_meta_old = pub_meta.clone();

        let priv_store = ReadonlyPrefixedStorage::new(&deps.storage, PREFIX_PRIV_META);
        let priv_meta: Metadata = load(&priv_store, &token_key1).unwrap();
        let priv_meta_old = priv_meta.clone();

        assert_ne!(token.owner, david_raw);

        // Send the NFT as the owner

        let send_msg = Some(
            to_binary(&ExecuteMsg::RevokeAll {
                operator: Addr::unchecked("alice").to_string(),
                padding: None,
            })
            .unwrap(),
        );

        let execute_msg = ExecuteMsg::SendNft {
            contract: Addr::unchecked("david").to_string(),
            receiver_info: None,
            token_id: "MyNFT".to_string(),
            msg: send_msg.clone(),
            memo: Some("Xfer it".to_string()),
            padding: None,
        };
        let _execute_result = execute(
            deps.as_mut(),
            Env {
                block: BlockInfo {
                    height: 1,
                    time: Timestamp::from_seconds(100),
                    chain_id: "cosmos-testnet-14002".to_string(),
                },
                contract: cosmwasm_std::ContractInfo {
                    address: Addr::unchecked(MOCK_CONTRACT_ADDR),
                    code_hash: "".to_string(),
                },
                transaction: None,
            },
            MessageInfo {
                sender: Addr::unchecked("alice"),
                funds: vec![],
            },
            execute_msg,
        );

        // Confirm that the autherization keys have been altered.
        let info_store = ReadonlyPrefixedStorage::new(&deps.storage, PREFIX_INFOS);
        let token: Token = json_load(&info_store, &token_key1).unwrap();

        assert_eq!(token.owner, david_raw);

        let pub_store = ReadonlyPrefixedStorage::new(&deps.storage, PREFIX_PUB_META);
        let pub_meta: Metadata = load(&pub_store, &token_key1).unwrap();
        assert_ne!(pub_meta.extension.unwrap().auth_key, pub_meta_old.extension.unwrap().auth_key);
        let priv_store = ReadonlyPrefixedStorage::new(&deps.storage, PREFIX_PRIV_META);
        let priv_meta: Metadata = load(&priv_store, &token_key1).unwrap();
        assert_ne!(priv_meta.extension.unwrap().auth_key, priv_meta_old.extension.unwrap().auth_key);
    }
}