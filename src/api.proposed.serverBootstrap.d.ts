// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export {};

declare module './api' {
    export interface Jupyter {
        /**
         * Activates a Jupyter Server from a collection owned by the calling extension.
         * The method creates or reuses the remote kernel finder and starts kernel discovery.
         * Callers should observe the kernel service to determine when discovery completes.
         * It does not select a kernel or start a kernel session.
         */
        activateJupyterServer(collectionId: string, serverId: string): Promise<void>;
    }
}
