// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { assert, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { anything, instance, mock, verify, when } from 'ts-mockito';
import { JupyterServerCollection } from '../../../api';
import { IRemoteKernelFinderController } from '../../../kernels/jupyter/finder/types';
import { IJupyterServerProviderRegistry } from '../../../kernels/jupyter/types';
import { INotebookPythonEnvironmentService } from '../../../notebooks/types';
import { IExtensionContext, IExtensions } from '../../../platform/common/types';
import { IServiceContainer, IServiceManager } from '../../../platform/ioc/types';
import { buildApi } from '..';
import { activateJupyterServer } from '.';

use(chaiAsPromised);

suite('Unstable Jupyter server API', () => {
    test('Initializes a server from the collection owned by the calling extension', async () => {
        const extensions = mock<IExtensions>();
        const registry = mock<IJupyterServerProviderRegistry>();
        const finderController = mock<IRemoteKernelFinderController>();
        const matchingCollection = mock<JupyterServerCollection>();
        const otherCollection = mock<JupyterServerCollection>();
        when(extensions.determineExtensionFromCallStack()).thenReturn({
            extensionId: 'publisher.extension',
            displayName: 'Provider Extension'
        });
        when(matchingCollection.extensionId).thenReturn('publisher.extension');
        when(matchingCollection.id).thenReturn('collection-1');
        when(otherCollection.extensionId).thenReturn('other.extension');
        when(otherCollection.id).thenReturn('collection-1');
        when(registry.jupyterCollections).thenReturn([instance(otherCollection), instance(matchingCollection)]);
        when(finderController.activateJupyterServer(instance(matchingCollection), 'server-1')).thenResolve();
        const serviceContainer = createServiceContainer(
            instance(extensions),
            instance(registry),
            instance(finderController)
        );

        await activateJupyterServer('collection-1', 'server-1', serviceContainer);

        verify(finderController.activateJupyterServer(instance(matchingCollection), 'server-1')).once();
        verify(finderController.activateJupyterServer(instance(otherCollection), anything())).never();
    });

    test('Rejects when the calling extension does not own the requested collection', async () => {
        const extensions = mock<IExtensions>();
        const registry = mock<IJupyterServerProviderRegistry>();
        const finderController = mock<IRemoteKernelFinderController>();
        const otherCollection = mock<JupyterServerCollection>();
        when(extensions.determineExtensionFromCallStack()).thenReturn({
            extensionId: 'publisher.extension',
            displayName: 'Provider Extension'
        });
        when(otherCollection.extensionId).thenReturn('other.extension');
        when(otherCollection.id).thenReturn('collection-1');
        when(registry.jupyterCollections).thenReturn([instance(otherCollection)]);
        const serviceContainer = createServiceContainer(
            instance(extensions),
            instance(registry),
            instance(finderController)
        );

        await assert.isRejected(
            activateJupyterServer('collection-1', 'server-1', serviceContainer),
            "Jupyter Server Collection 'collection-1' was not found for extension 'publisher.extension'."
        );

        verify(finderController.activateJupyterServer(anything(), anything())).never();
    });

    test('Exposes server activation through the public API', async () => {
        const extensions = mock<IExtensions>();
        const registry = mock<IJupyterServerProviderRegistry>();
        const finderController = mock<IRemoteKernelFinderController>();
        const environmentService = mock<INotebookPythonEnvironmentService>();
        const context = mock<IExtensionContext>();
        const matchingCollection = mock<JupyterServerCollection>();
        when(extensions.determineExtensionFromCallStack()).thenReturn({
            extensionId: 'publisher.extension',
            displayName: 'Provider Extension'
        });
        when(matchingCollection.extensionId).thenReturn('publisher.extension');
        when(matchingCollection.id).thenReturn('collection-1');
        when(registry.jupyterCollections).thenReturn([instance(matchingCollection)]);
        when(finderController.activateJupyterServer(instance(matchingCollection), 'server-1')).thenResolve();
        const serviceContainer = createServiceContainer(
            instance(extensions),
            instance(registry),
            instance(finderController),
            instance(environmentService)
        );
        const api = buildApi(Promise.resolve(), instance(mock<IServiceManager>()), serviceContainer, instance(context));

        await api.activateJupyterServer('collection-1', 'server-1');

        verify(finderController.activateJupyterServer(instance(matchingCollection), 'server-1')).once();
    });
});

function createServiceContainer(
    extensions: IExtensions,
    registry: IJupyterServerProviderRegistry,
    finderController: IRemoteKernelFinderController,
    environmentService?: INotebookPythonEnvironmentService
): IServiceContainer {
    return {
        get: <T>(serviceIdentifier: symbol): T => {
            if (serviceIdentifier === IExtensions) {
                return extensions as T;
            }
            if (serviceIdentifier === IJupyterServerProviderRegistry) {
                return registry as T;
            }
            if (serviceIdentifier === IRemoteKernelFinderController) {
                return finderController as T;
            }
            if (serviceIdentifier === INotebookPythonEnvironmentService && environmentService) {
                return environmentService as T;
            }
            throw new Error(`Unexpected service identifier: ${String(serviceIdentifier)}`);
        },
        getAll: () => [],
        tryGet: () => undefined
    };
}
